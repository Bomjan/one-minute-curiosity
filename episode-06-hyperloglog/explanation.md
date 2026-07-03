# Counting a Billion Things with 12 KB

How do you count the number of *unique* visitors to a website with a billion hits a day, without storing a billion IDs? A strange little algorithm called HyperLogLog answers this by counting coin flips instead of people.

---

## The Problem

You're running a search engine and want to know: **how many distinct search queries did we see today?**

The obvious approach: put every query into a `HashSet` and check its size at the end.

The problem: if you get a billion queries, that `HashSet` could need **gigabytes of memory** — one entry per unique string, even if 99% of them are duplicates you already knew about.

**Your goal:** Estimate the number of distinct items in a massive stream using a *fixed, tiny* amount of memory — even if the true count is in the billions. A small margin of error (~2%) is totally fine.

This is the **cardinality estimation** problem, and it's one of the most delightfully counter-intuitive tricks in computer science.

---

## Example

```
Stream: ["cat", "dog", "cat", "bird", "dog", "fish", "cat", "owl"]

Exact distinct count: 5  (cat, dog, bird, fish, owl)

HyperLogLog estimate: ~5 (using only a handful of bytes,
                           regardless of stream length)
```

Scale that stream up to 100 million entries, and a `HashSet` grows to gigabytes — while the HyperLogLog estimator still uses the **same fixed memory** and still lands within a couple percent of the true answer.

---

## Why It Matters

Cardinality estimation quietly powers systems you use every day:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `SELECT COUNT(DISTINCT user_id)` in Redis, Postgres, Presto — done via HyperLogLog under the hood |
| **Networking** | Counting unique IP addresses hitting a router during a DDoS scan |
| **Web analytics** | "Unique visitors today" counters at companies with billions of events/day |
| **Distributed systems** | Merging cardinality estimates from thousands of machines without shipping raw data |
| **Cybersecurity** | Estimating the number of distinct hosts scanned by a botnet in real time |

The deeper lesson: **you don't need exact answers to make exact decisions.** A 2% margin of error is a bargain when it turns "impossible" into "instant."

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly and count how many flips until you see heads. Getting heads on flip 1 is common. Getting heads for the *first* time on flip 20 is rare — so rare that if it happens, it's a strong hint you flipped the coin *many* times in parallel.

HyperLogLog turns every incoming item into a "coin flip sequence" using a hash function:

1. **Hash** each item into a (pseudo-random, uniformly distributed) binary string.
2. **Count leading zeros** in that hash — this is your "flips until heads."
3. **Track the maximum** leading-zero count seen so far, per bucket.
4. If the max leading-zero count is `k`, roughly `2^k` distinct items have passed through.

### Why Buckets?

A single max-leading-zeros counter is noisy — one lucky hash can throw off the whole estimate. HyperLogLog splits incoming hashes into **many buckets** (using a few bits of the hash to pick the bucket), tracks a max-leading-zeros counter *per bucket*, then **averages across buckets** (harmonic mean, to dampen outliers). More buckets = tighter estimate, but memory stays fixed no matter how many items you feed it.

### Step-by-Step Walkthrough

```
1. Item arrives → hash it → get a 32-bit binary string
2. First few bits pick which bucket (of, say, 16) this item belongs to
3. Remaining bits: count leading zeros → rho
4. bucket[i] = max(bucket[i], rho)
5. Repeat for every item — memory never grows, only the numbers inside buckets change
6. Estimate = harmonic_mean(2^bucket[0], 2^bucket[1], ..., 2^bucket[15]) * correction_constant
```

No item is ever stored. Only 16 small integers exist in memory, forever.

---

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    HASH_BITS = 64  # digest[:8] gives an 8-byte, 64-bit hash

    def __init__(self, num_buckets_pow=4):
        self.b = num_buckets_pow
        self.m = 2 ** self.b          # number of buckets
        self.buckets = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha256(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")

    def add(self, item):
        h = self._hash(item)
        bucket_index = h & (self.m - 1)          # last b bits pick the bucket
        remaining = h >> self.b
        remaining_bits = self.HASH_BITS - self.b
        rho = self._leading_zeros(remaining, remaining_bits) + 1  # "flips until heads"
        self.buckets[bucket_index] = max(self.buckets[bucket_index], rho)

    def _leading_zeros(self, x, bits):
        if x == 0:
            return bits
        return bits - x.bit_length()

    def estimate(self):
        harmonic_sum = sum(2 ** -b for b in self.buckets)
        raw_estimate = self.alpha * self.m * self.m / harmonic_sum
        return round(raw_estimate)


if __name__ == "__main__":
    hll = HyperLogLog(num_buckets_pow=10)  # 1024 buckets

    unique_users = [f"user_{i % 50000}" for i in range(500_000)]
    for u in unique_users:
        hll.add(u)

    print(f"True distinct count: 50000")
    print(f"HyperLogLog estimate: {hll.estimate()}")
    print(f"Memory used: {hll.m} small integers, no matter the stream size")
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
    static HASH_BITS = 64; // readBigUInt64BE gives a 64-bit hash

    constructor(numBucketsPow = 10) {
        this.b = numBucketsPow;
        this.m = 2 ** this.b; // number of buckets
        this.buckets = new Uint8Array(this.m);
        this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("sha256").update(String(item)).digest();
        return digest.readBigUInt64BE(0);
    }

    add(item) {
        const h = this._hash(item);
        const bucketIndex = Number(h & BigInt(this.m - 1)); // last b bits
        const remaining = h >> BigInt(this.b);
        const remainingBits = HyperLogLog.HASH_BITS - this.b;
        const rho = this._leadingZeros(remaining, remainingBits) + 1; // "flips until heads"
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], rho);
    }

    _leadingZeros(x, bits) {
        if (x === 0n) return bits;
        return bits - x.toString(2).length;
    }

    estimate() {
        const harmonicSum = this.buckets.reduce((sum, b) => sum + 2 ** -b, 0);
        const rawEstimate = (this.alpha * this.m * this.m) / harmonicSum;
        return Math.round(rawEstimate);
    }
}

const hll = new HyperLogLog(10); // 1024 buckets

const uniqueUsers = Array.from({ length: 500_000 }, (_, i) => `user_${i % 50000}`);
for (const u of uniqueUsers) hll.add(u);

console.log("True distinct count: 50000");
console.log(`HyperLogLog estimate: ${hll.estimate()}`);
console.log(`Memory used: ${hll.m} small integers, no matter the stream size`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insertion | One hash + one bucket update, regardless of how many items have been seen |
| **Space** | O(m) | Fixed number of buckets (e.g. 1024 bytes), independent of stream size — counting a billion items costs the same memory as counting a hundred |

Compare that to a `HashSet`, which is O(n) space — memory grows linearly with the number of *unique* items. HyperLogLog trades a small, well-understood error (~1.04/√m) for a constant memory budget, which is a trade databases and network monitors make gladly at scale.

---

## One Minute Insight

> **Approximation is a feature, not a compromise.** When "exactly right" costs gigabytes and "99% right" costs kilobytes, the honest engineering answer is often to embrace the error bar.

HyperLogLog works because *rare events carry information about scale* — a hash with 20 leading zeros is a whisper that says "a lot of things passed through here." That single idea, applied at scale and averaged across buckets to smooth out luck, is why Redis can tell you "about 2.3 million" unique visitors using less memory than a single tweet.

*Run `code.py` or `code.js` to see it in action.*
