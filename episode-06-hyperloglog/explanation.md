# Counting a Billion Things in 1 Kilobyte

Redis can tell you how many *unique* visitors hit your site today — out of billions of page loads — using less memory than a single photo thumbnail. It doesn't remember a single visitor. It just watches for something rare.

---

## The Problem

You're watching a firehose of events: user IDs, IP addresses, search queries — anything. You need to answer one question: **how many distinct values have you seen?**

The obvious approach is a hash set: insert every value, ask for its size. It's exact, but it's also **O(n) memory** — track a billion unique IPs and you need gigabytes just to remember them, forever, even after you only wanted a single number back.

Can you estimate that count using a **fixed, tiny amount of memory**, no matter how big the stream gets — trading perfect accuracy for a rough answer that's *close enough*?

## Example

```
stream = [7, 7, 3, 9, 3, 7, 1, 9, 3, 7, 1, 1, ...]   (1,000,000 events)
true distinct count = 198,633

A hash set: stores all 198,633 unique values → grows with the data.
HyperLogLog: stores 1,024 small numbers (fixed) → estimates 208,727.

Error: ~5% — using ~1 KB instead of megabytes.
```

## Why It Matters

This isn't a party trick — probabilistic cardinality estimation runs quietly inside systems you already use:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Query planners (Postgres, BigQuery `APPROX_COUNT_DISTINCT`) estimate row cardinality to pick a join strategy |
| **Caching / Analytics** | Redis's `PFCOUNT` counts unique visitors, searches, or events across billions of hits |
| **Networking** | Routers estimate the number of distinct flows or source IPs without per-packet bookkeeping |
| **Distributed systems** | Merging counts from many machines is just merging small register arrays — no need to ship raw data around |
| **Cybersecurity** | Detecting DDoS or port-scan anomalies by tracking distinct source addresses cheaply, in real time |

The deeper lesson: **when "exact" is too expensive, look for a statistical shortcut that's provably close.**

## Solution

### The Key Insight: Rare Patterns Reveal Scale

Hash every incoming value — the output looks like a random bit string. Now ask: *what's the longest run of leading zeros you've seen in any hash?*

- A run of 1 leading zero happens ~50% of the time.
- A run of 5 leading zeros happens ~3% of the time.
- A run of 20 leading zeros happens ~1 in a million times.

If you *do* spot a 20-zero run, that's evidence you've hashed roughly a million distinct things — a rare event that only shows up once you've tried enough random inputs. **The longest run seen is a clue to how many distinct items produced it.**

One run alone is noisy (bad luck can strike early). So HyperLogLog splits incoming values across many small **buckets** (using a few hash bits to pick the bucket), tracks the *longest run seen in each bucket*, and combines all of them with a harmonic mean — which is far more stable than a plain average because it punishes any bucket that got a suspiciously huge outlier run.

### Step-by-Step Walkthrough

```
1. Hash the value into a 32-bit number.
2. Use the first `p` bits to choose a bucket (e.g. p=10 → 1024 buckets).
3. In the remaining bits, find the position of the leftmost 1-bit ("rank").
4. Store the MAX rank ever seen in that bucket.
5. To estimate: combine all bucket maxes with a harmonic mean formula:

     estimate = alpha * m^2 / sum(2^-register[i] for each bucket i)

   where m = number of buckets, alpha = a small bias-correction constant.
```

No value is ever stored — only the biggest "leading zero run" per bucket, each of which fits in a handful of bits.

## Code

### Python

```python
import hashlib
import random


def _hash(value):
    """Deterministic 32-bit hash for a value."""
    digest = hashlib.md5(str(value).encode()).hexdigest()
    return int(digest[:8], 16)


def _rank(bits, width):
    """Position of the leftmost 1-bit in `bits` (a `width`-bit number), 1-indexed."""
    binary = format(bits, f"0{width}b")
    first_one = binary.find("1")
    return (width if first_one == -1 else first_one) + 1


class HyperLogLog:
    def __init__(self, precision=10):
        self.p = precision                # bits used to pick a bucket
        self.m = 1 << precision           # number of buckets (registers)
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant

    def add(self, value):
        x = _hash(value)
        bucket = x >> (32 - self.p)
        remainder = x & ((1 << (32 - self.p)) - 1)
        rank = _rank(remainder, 32 - self.p)
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        harmonic_mean = sum(2 ** -r for r in self.registers)
        return round(self.alpha * self.m ** 2 / harmonic_mean)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers, ~1 KB total

    stream = [random.randint(1, 200_000) for _ in range(1_000_000)]
    for item in stream:
        hll.add(item)

    print("Estimated distinct:", hll.count())
    print("Actual distinct:   ", len(set(stream)))
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash32(value) {
    const digest = crypto.createHash("md5").update(String(value)).digest("hex");
    return parseInt(digest.slice(0, 8), 16) >>> 0;
}

function rank(bits, width) {
    const binary = bits.toString(2).padStart(width, "0");
    const firstOne = binary.indexOf("1");
    return (firstOne === -1 ? width : firstOne) + 1;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;
        this.m = 1 << precision;
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    add(value) {
        const x = hash32(value);
        const bucket = x >>> (32 - this.p);
        const remainder = x & ((1 << (32 - this.p)) - 1);
        const r = rank(remainder, 32 - this.p);
        this.registers[bucket] = Math.max(this.registers[bucket], r);
    }

    count() {
        const harmonicMean = this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);
        return Math.round((this.alpha * this.m * this.m) / harmonicMean);
    }
}

const hll = new HyperLogLog(10); // 1024 registers, ~1 KB total

const stream = [];
for (let i = 0; i < 1_000_000; i++) {
    stream.push(Math.floor(Math.random() * 200_000) + 1);
}
stream.forEach((item) => hll.add(item));

console.log("Estimated distinct:", hll.count());
console.log("Actual distinct:   ", new Set(stream).size);
```

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insert | One hash, one bucket lookup, one comparison — regardless of stream size |
| **Space** | O(m) | Fixed number of buckets (e.g. 1,024), each storing a tiny integer — never grows with the data |

A hash set costs O(n) memory and gives you an exact count. HyperLogLog trades that exactness for a **~1–2% typical error** at a memory footprint that stays flat whether you've seen a thousand items or a trillion.

## One Minute Insight

> **You don't need to remember everything to know how much there was.** A rare pattern — the longest run of leading zeros — carries a statistical fingerprint of scale. Spread that trick across many buckets and average carefully, and a counter smaller than a JPEG can track cardinality across a planet-scale stream.

This is the same spirit as a Bloom filter (episode 04): give up perfect certainty, gain a memory bound that doesn't care how big "big" gets. When exact answers get expensive, ask what *approximate* answer you can get away with — and how cheaply.

*Run `code.py` or `code.js` to see it in action.*
