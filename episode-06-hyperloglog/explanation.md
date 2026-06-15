# Counting a Billion Things With a Few Kilobytes

Imagine counting every unique visitor to a website with a billion hits a day — without storing a single visitor ID. Sounds impossible, but there's a beautifully weird trick that gets you within ~2% accuracy using less memory than a single tweet.

---

## The Problem

You're streaming a huge sequence of items — user IDs, IP addresses, search queries — and you need to answer one question: **"How many *distinct* items have I seen?"**

The obvious approach is a `Set`: insert every item, check its size at the end. That works great... until you have a billion unique items and your `Set` eats gigabytes of RAM.

**Can you estimate the count of distinct items using a *fixed*, tiny amount of memory — regardless of how many items you process?**

This is exactly the problem **HyperLogLog** solves, and it's the algorithm Redis, Google BigQuery, and Postgres all use for `COUNT(DISTINCT ...)`-style estimates at scale.

---

## Example

```
Stream: 100,000 events, but only 50,000 distinct user IDs
        (each user appears twice on average)

Exact answer (using a Set):     50,000 items stored
HyperLogLog estimate (1024 buckets, ~1KB): ~49,300 - 50,700

Error: under 2%, using 1024 small counters instead of 50,000 strings.
```

---

## Why It Matters

Counting distinct things shows up *everywhere* at scale:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `COUNT(DISTINCT user_id)` over billions of rows (Postgres, BigQuery) |
| **Analytics** | "How many unique visitors today?" without storing every visitor |
| **Networking** | Estimating distinct IPs hitting a server (DDoS / traffic analysis) |
| **Distributed systems** | Merging cardinality estimates across shards with simple max() |
| **Caching** | Sizing caches based on estimated unique key counts |

The deeper idea — **trade a little accuracy for a massive memory win** — is the foundation of all probabilistic data structures (Bloom filters, Count-Min Sketch, HyperLogLog).

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Hash every item into a (effectively) random bit string. Now ask: **"How many leading zeros does this hash have before the first 1?"**

- A run of 0 leading zeros happens ~50% of the time.
- A run of 5 leading zeros happens ~1/32 of the time.
- A run of 20 leading zeros happens ~1/1,000,000 of the time.

If you've seen a hash with **20 leading zeros**, that's strong evidence you've processed roughly a million distinct items — because rare patterns only show up when you've tried *a lot* of inputs.

### Step-by-Step Walkthrough

1. **Split the hash in two**: use the first `b` bits to pick one of `m = 2^b` buckets, and use the rest of the bits to measure the "leading zero run length."
2. **Per bucket, keep the maximum run length ever seen.** Each bucket is just a tiny integer (a handful of bits).
3. **Combine the buckets** with a harmonic mean — this smooths out noise from any single lucky/unlucky bucket.
4. **Apply a bias-correction constant (`alpha`)**, tuned by `m`, to get the final estimate.

```
1024 buckets, each storing a number from 0-50ish
  → roughly 1024 x 6 bits ≈ 768 bytes total

...to estimate cardinalities in the millions or billions!
```

The standard error is about `1.04 / sqrt(m)` — with 1024 buckets, that's ~3%.

---

## Code

### Python

```python
import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                      # bits used to pick a bucket
        self.m = 1 << b                 # number of buckets (2^b)
        self.buckets = [0] * self.m
        # bias-correction constant, tuned for the number of buckets
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha256(str(item).encode()).hexdigest()
        return int(digest, 16)

    def _leading_zeros(self, x, max_bits=256):
        if x == 0:
            return max_bits
        count = 0
        bit = max_bits - 1
        while bit >= 0 and not (x >> bit) & 1:
            count += 1
            bit -= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket_index = x & (self.m - 1)        # last b bits choose the bucket
        remainder = x >> self.b                # the rest of the hash
        run = self._leading_zeros(remainder, max_bits=256 - self.b) + 1
        # keep the longest "run of zeros" ever seen for this bucket
        self.buckets[bucket_index] = max(self.buckets[bucket_index], run)

    def count(self):
        z = sum(2 ** -r for r in self.buckets)
        return round(self.alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 buckets
    unique_items = set()

    for i in range(100_000):
        item = f"user_{i % 50_000}"   # only 50,000 distinct users
        hll.add(item)
        unique_items.add(item)

    actual = len(unique_items)
    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique count:   {actual}")
    print(f"HyperLogLog estimate:  {estimate}")
    print(f"Error:                 {error:.2f}%")
    print(f"Memory: {hll.m} tiny counters vs. {actual} stored items")
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;                 // bits used to pick a bucket
        this.m = 1 << b;            // number of buckets (2^b)
        this.buckets = new Array(this.m).fill(0);
        // bias-correction constant, tuned for the number of buckets
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("sha256").update(String(item)).digest("hex");
        return BigInt("0x" + digest);
    }

    _leadingZeros(x, maxBits = 256) {
        if (x === 0n) return maxBits;
        let count = 0;
        let bit = BigInt(maxBits - 1);
        while (bit >= 0n && ((x >> bit) & 1n) === 0n) {
            count++;
            bit--;
        }
        return count;
    }

    add(item) {
        const x = this._hash(item);
        const bucketIndex = Number(x & BigInt(this.m - 1)); // last b bits choose the bucket
        const remainder = x >> BigInt(this.b);              // the rest of the hash
        const run = this._leadingZeros(remainder, 256 - this.b) + 1;
        // keep the longest "run of zeros" ever seen for this bucket
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], run);
    }

    count() {
        const z = this.buckets.reduce((sum, r) => sum + 2 ** -r, 0);
        return Math.round((this.alpha * this.m * this.m) / z);
    }
}

const hll = new HyperLogLog(10); // 1024 buckets
const uniqueItems = new Set();

for (let i = 0; i < 100_000; i++) {
    const item = `user_${i % 50_000}`; // only 50,000 distinct users
    hll.add(item);
    uniqueItems.add(item);
}

const actual = uniqueItems.size;
const estimate = hll.count();
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual unique count:   ${actual}`);
console.log(`HyperLogLog estimate:  ${estimate}`);
console.log(`Error:                 ${error.toFixed(2)}%`);
console.log(`Memory: ${hll.m} tiny counters vs. ${actual} stored items`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per item | One hash, one bit-scan, one max() update |
| **Space** | O(m) — fixed | `m` small counters, independent of stream size |

Compare this to a `Set`, which is **O(n)** in space — it grows forever as you see new items. HyperLogLog's memory is *constant*, whether you process a thousand items or a trillion.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** HyperLogLog turns "how many unique things?" into "how rare was the rarest pattern I saw?" — because rarity itself encodes scale. It's the same intuition behind estimating crowd size from the tallest person you spot, or estimating a population from the highest lottery number drawn. Sometimes the extremes tell you more than the full dataset ever could.

*Run `code.py` or `code.js` to see it in action.*
