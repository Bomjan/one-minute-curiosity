# Counting to a Billion in 256 Bytes

Ask a database "how many unique visitors did we have today?" and it can either scan billions of rows to be exact, or lie to you a little and answer instantly. It turns out the lie is small enough that almost every big system chooses it on purpose.

---

## The Problem

You're tracking unique visitors to a website. Millions of events stream in per hour, each tagged with a user ID. You need to answer: **"how many *distinct* IDs have we seen?"**

The obvious approach — store every ID in a `Set` — works, but a set of a billion unique 64-bit IDs costs **gigabytes of memory**, just to answer one number.

**Can you estimate the count of unique items in a stream using a *fixed*, tiny amount of memory — regardless of whether the stream has a thousand items or a trillion?**

This is the **cardinality estimation** problem, and the classic answer is the **HyperLogLog** algorithm: a data structure that estimates cardinality within ~2% error using just a few hundred bytes, no matter how large the stream gets.

---

## Example

```
Stream: "user-1", "user-2", "user-1", "user-3", "user-2", "user-4" ...

Exact answer (a Python set):     4 unique users
HyperLogLog estimate:            ~4 (with a small % margin of error)

Now scale the stream to 100,000 unique users:

Exact answer:        100,000 users   →  needs ~100,000 stored keys
HyperLogLog estimate: ~98,374 users  →  needs only 256 stored bytes
```

The magic: memory usage **does not grow** as the stream grows. 256 registers estimate 100 items or 100 billion items equally well.

---

## Why It Matters

Cardinality estimation is one of the most quietly-used tricks in real infrastructure:

| System | Use of HyperLogLog |
| :--- | :--- |
| **Redis** | `PFADD` / `PFCOUNT` — built-in HyperLogLog for unique counters |
| **Databases** | `APPROX_COUNT_DISTINCT` in BigQuery, Presto, Redshift |
| **Analytics** | Counting unique visitors/events across billions of log lines |
| **Networking** | Estimating distinct flows or IPs hitting a router in real time |
| **Distributed systems** | Merging counts across shards without shipping raw data around |

The deeper lesson: **when exactness is expensive and approximation is cheap, a small, honest margin of error can be worth orders of magnitude in memory.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly. Getting a run of `k` heads in a row is rare — it happens about once every `2^k` flips. So if you *observe* a run of `k` heads, you can *infer* roughly `2^k` flips happened, without ever counting them.

HyperLogLog applies this to hashing:

1. **Hash** each item into a uniformly random-looking integer.
2. Use its **first `b` bits** to pick one of `m = 2^b` buckets (this lets different buckets track different parts of the stream in parallel).
3. In the **remaining bits**, count the position of the **leftmost 1-bit** ("how many leading zeros, plus one").
4. Each bucket keeps only the **maximum** run length it has ever seen.
5. Combine all `m` buckets with a **harmonic mean** (which tolerates outliers better than an arithmetic mean) to produce the final cardinality estimate.

Duplicate items hash to the same bucket with the same run length, so **repeats don't inflate the count** — only new distinct values can push a bucket's maximum higher.

### Step-by-Step Walkthrough

```
Item "user-42" → hash → binary: 10110 | 00101...
                          bucket ^   remainder ^

bucket = 10110 (bits interpreted as an index, picks bucket #22 out of m)
remainder = 00101...
leading zero run = 3 (three 0s before the first 1) → store 3 in bucket 22
  (if bucket 22 already had something bigger, keep the bigger one)

Repeat for every item in the stream.
Each bucket ends up holding "the longest zero-run seen for anything routed here."

Final estimate = alpha * m^2 / sum(2^-register  for each bucket)
```

Only `m` small integers (one per bucket) are ever stored — never the actual items.

---

## Code

### Python

```python
import hashlib
import math


def _hash32(item):
    """Turn any item into a well-mixed 32-bit integer."""
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)


def _leading_zero_run(w, width):
    """Position of the leftmost 1-bit in a `width`-bit number (1-indexed)."""
    for i in range(width):
        if w & (1 << (width - 1 - i)):
            return i + 1
    return width + 1  # all zeros (rare, but possible)


class HyperLogLog:
    def __init__(self, b=8):
        self.b = b                                   # bits used to pick a bucket
        self.m = 1 << b                               # number of buckets (registers)
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)    # bias-correction constant

    def add(self, item):
        x = _hash32(item)
        bucket = x >> (32 - self.b)                   # top b bits choose the bucket
        remainder = x & ((1 << (32 - self.b)) - 1)     # the rest is our "coin flips"
        run = _leading_zero_run(remainder, 32 - self.b)
        self.registers[bucket] = max(self.registers[bucket], run)

    def count(self):
        raw = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)

        zero_buckets = self.registers.count(0)
        if raw <= 2.5 * self.m and zero_buckets > 0:
            # Small cardinalities: linear counting is more accurate.
            return round(self.m * math.log(self.m / zero_buckets))
        return round(raw)


if __name__ == "__main__":
    true_unique = 100_000
    hll = HyperLogLog(b=8)  # 256 registers = 256 bytes of state

    for i in range(true_unique):
        hll.add(f"user-{i}")

    estimate = hll.count()
    error = abs(estimate - true_unique) / true_unique * 100

    print(f"True unique items: {true_unique}")
    print(f"HyperLogLog estimate: {estimate}")
    print(f"Error: {error:.2f}%")
```

### JavaScript

```javascript
// Turn any item into a well-mixed 32-bit unsigned integer (djb2 + avalanche finisher).
function hash32(item) {
    const str = String(item);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;
    return hash >>> 0;
}

// Position of the leftmost 1-bit in a `width`-bit number (1-indexed).
function leadingZeroRun(w, width) {
    for (let i = 0; i < width; i++) {
        if (w & (1 << (width - 1 - i))) return i + 1;
    }
    return width + 1;
}

class HyperLogLog {
    constructor(b = 8) {
        this.b = b;                                  // bits used to pick a bucket
        this.m = 1 << b;                              // number of buckets (registers)
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m);   // bias-correction constant
    }

    add(item) {
        const x = hash32(item);
        const bucket = x >>> (32 - this.b);
        const remainder = x & ((1 << (32 - this.b)) - 1);
        const run = leadingZeroRun(remainder, 32 - this.b);
        this.registers[bucket] = Math.max(this.registers[bucket], run);
    }

    count() {
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (this.alpha * this.m ** 2) / sum;

        const zeroBuckets = this.registers.filter((r) => r === 0).length;
        if (raw <= 2.5 * this.m && zeroBuckets > 0) {
            return Math.round(this.m * Math.log(this.m / zeroBuckets));
        }
        return Math.round(raw);
    }
}

const trueUnique = 100_000;
const hll = new HyperLogLog(8); // 256 registers = 256 bytes of state

for (let i = 0; i < trueUnique; i++) {
    hll.add(`user-${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - trueUnique) / trueUnique) * 100;

console.log(`True unique items: ${trueUnique}`);
console.log(`HyperLogLog estimate: ${estimate}`);
console.log(`Error: ${error.toFixed(2)}%`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `add`, O(m) for `count` | Each insert only hashes and updates one register; the final estimate scans all `m` registers once |
| **Space** | O(m) — constant, independent of stream size | Only `m` small integers are stored, whether you've seen 100 items or 100 billion |

Compare this to an exact `Set`-based counter: O(n) space, growing forever. HyperLogLog trades a small, well-understood statistical error (roughly `1.04 / sqrt(m)`) for **memory that never grows**.

---

## One Minute Insight

> **You don't need to remember everything to know how much you've seen.** HyperLogLog throws away every item's identity and keeps only the *rarest event* it triggered — because rare events are a fingerprint of scale.

The same idea — using extremal statistics (max, min, longest streak) as a cheap proxy for a much bigger quantity — shows up far beyond counting: reservoir sampling, skip lists, and even how casinos estimate how "hot" a slot machine's payouts are. When exact tracking is too expensive, ask instead: *"what rare thing would I expect to see if the true count were X?"* — then just watch for that.

*Run `code.py` or `code.js` to see it in action.*
