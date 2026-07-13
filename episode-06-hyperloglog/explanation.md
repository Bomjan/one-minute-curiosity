# Counting a Billion Things With a Handful of Bytes

Ask Google "how many unique searches today?" and nobody stores a billion strings in a hash set to answer. They flip a coin — metaphorically — a few million times, and count how lucky it got.

---

## The Problem

You're watching a firehose of data — page views, IP addresses, search queries — and someone asks: **"how many *distinct* items have you seen?"**

The obvious answer is a `set()`: insert everything, check membership, done. But if the stream has a billion unique values, that set eats gigabytes of RAM just to answer one number.

**Can you estimate the count of distinct items using a *fixed* amount of memory — a few kilobytes — no matter whether you've seen a thousand items or a trillion?**

That's the job of **HyperLogLog**, the algorithm quietly running inside Redis (`PFCOUNT`), Presto, BigQuery, and every "unique visitors" dashboard you've ever trusted.

---

## Example

```
Stream: "user_1", "user_2", "user_3", ..., "user_10000"
        (then "user_1" through "user_5000" repeat as duplicates)

A plain set:        stores all 10,000 strings  → ~600 KB
HyperLogLog (16 buckets): stores 16 small numbers → ~16 bytes

set()        → 10000  (exact)
HyperLogLog  → 7568   (estimate, off by ~24%)
```

With only 16 buckets the error is large on purpose — it's the smallest configuration that still demonstrates the idea. Real systems use 1,024–16,384 buckets and land within **1-2%** of the true count, using kilobytes instead of gigabytes.

---

## Why It Matters

Counting distinct things shows up everywhere, and exact counting doesn't scale:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `COUNT(DISTINCT user_id)` over billions of rows without a full scan |
| **Networking** | Estimating unique IPs hitting a server during a DDoS |
| **Web analytics** | "Unique visitors today" without storing every visitor ID |
| **Distributed systems** | Merging sketches from 100 servers into one global estimate (`O(1)` merge!) |
| **Databases (Redis)** | `PFADD` / `PFCOUNT` — HyperLogLog built directly into the data store |

The deeper lesson: **when a question only needs an approximate answer, trading a little accuracy for a lot less memory is a legitimate engineering move — not a hack.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly and count the streak of heads before the first tail. A streak of 3 isn't surprising. A streak of 20 is — and if you *did* see one, it hints you must have flipped the coin many, many times.

HyperLogLog turns every item into a coin-flip sequence using a hash function:

1. **Hash the item** into a random-looking bit string.
2. **Count the leading zeros** in that bit string (a "streak"). Longer streaks are exponentially rarer, so the *longest streak observed* is a signal for how many distinct items have passed through.
3. **One hash alone is too noisy** — a single lucky streak skews the estimate. So split hashes into `m` buckets (using a few bits of the hash to pick the bucket), track the best streak *per bucket*, and average across all buckets. Many small, independent guesses smooth out into one reliable estimate.
4. **Duplicates are invisible**: the same item always hashes to the same bucket with the same streak length, so re-adding it changes nothing — which is exactly the "distinct count" property we want.

### Step-by-Step Walkthrough

```
item = "user_42"
hash(item) = 128-bit number, e.g. 0110 1001 0001 ...

last 4 bits  → bucket index   (picks 1 of 16 buckets)
remaining bits → count leading zeros + 1 → "run length"

registers[bucket] = max(registers[bucket], run_length)

After seeing everything:
estimate = alpha * m^2 / sum(2^-registers[i] for each bucket)
```

`alpha` is a bias-correction constant, and the harmonic-mean-style sum makes the estimate resistant to any single bucket getting an unlucky (too-long) streak.

---

## Code

### Python

```python
import hashlib

class HyperLogLog:
    def __init__(self, num_bucket_bits=4):
        self.b = num_bucket_bits
        self.m = 1 << self.b  # number of buckets, e.g. 16
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)  # 128-bit integer

    def _leading_zeros(self, value, bit_width):
        if value == 0:
            return bit_width
        count = 0
        mask = 1 << (bit_width - 1)
        while value & mask == 0:
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket_index = x & (self.m - 1)              # last b bits pick the bucket
        remainder = x >> self.b                       # the rest of the bits
        run_length = self._leading_zeros(remainder, 128 - self.b) + 1
        self.registers[bucket_index] = max(self.registers[bucket_index], run_length)

    def estimate(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.registers)
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(num_bucket_bits=4)

    unique_items = [f"user_{i}" for i in range(10_000)]
    for item in unique_items:
        hll.add(item)

    # Adding duplicates should barely move the estimate.
    for item in unique_items[:5_000]:
        hll.add(item)

    print("Actual unique count:", len(set(unique_items)))
    print("HyperLogLog estimate:", hll.estimate())
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
    constructor(numBucketBits = 4) {
        this.b = numBucketBits;
        this.m = 1 << this.b; // number of buckets, e.g. 16
        this.registers = new Array(this.m).fill(0);
        this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("md5").update(String(item)).digest("hex");
        return BigInt("0x" + digest); // 128-bit integer
    }

    _leadingZeros(value, bitWidth) {
        if (value === 0n) return bitWidth;
        let count = 0;
        for (let i = bitWidth - 1; i >= 0; i--) {
            if ((value >> BigInt(i)) & 1n) break;
            count++;
        }
        return count;
    }

    add(item) {
        const x = this._hash(item);
        const bucketIndex = Number(x & BigInt(this.m - 1)); // last b bits pick the bucket
        const remainder = x >> BigInt(this.b); // the rest of the bits
        const runLength = this._leadingZeros(remainder, 128 - this.b) + 1;
        this.registers[bucketIndex] = Math.max(this.registers[bucketIndex], runLength);
    }

    estimate() {
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (this.alpha * this.m * this.m) / sum;
        return Math.round(raw);
    }
}

const hll = new HyperLogLog(4);

const uniqueItems = Array.from({ length: 10000 }, (_, i) => `user_${i}`);
uniqueItems.forEach((item) => hll.add(item));

// Adding duplicates should barely move the estimate.
uniqueItems.slice(0, 5000).forEach((item) => hll.add(item));

console.log("Actual unique count:", new Set(uniqueItems).size);
console.log("HyperLogLog estimate:", hll.estimate());
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `add`, O(m) per `estimate` | Each item is hashed once and updates a single register; the final pass just averages `m` numbers |
| **Space** | O(m) — independent of the number of items | `m` small counters (a handful of bits each), whether you've seen 100 items or 100 billion |

Compare that to a hash `set()`: O(n) space, growing forever with every new distinct item. HyperLogLog trades exactness for a *flat* memory footprint — the whole point of the algorithm.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** A handful of "longest streak I've seen" counters, averaged together, approximates a count that would otherwise require storing every single item.

This is the same trick behind Bloom filters and Count-Min Sketch: pick a signal that's cheap to update, expensive to fake, and let statistics do the counting so your memory doesn't have to.

*Run `code.py` or `code.js` to see it in action.*
