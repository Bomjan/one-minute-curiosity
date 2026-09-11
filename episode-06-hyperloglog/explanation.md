# Counting a Billion Things in 256 Bytes

Twitter wants to know how many *unique* people saw a hashtag today. Not roughly a billion — actually count them, one set, one giant lookup table. Except a set that size would eat gigabytes of RAM just to answer one number. There's a trick that answers it in **256 bytes**, off by a few percent. That trade is the whole curiosity.

---

## The Problem

You're watching a stream of events — page views, IP addresses, search queries, hashtag mentions — and you need to answer one question:

**"How many *distinct* values have I seen?"**

The obvious approach is a `set()`: insert everything, read `len(set)`. Correct, but it stores every unique item in memory forever. At web scale — billions of events a day — that's untenable.

**Your goal:** estimate the count of distinct elements using a *fixed*, tiny amount of memory, no matter whether you've seen 100 items or 100 billion.

This is called the **cardinality estimation problem**, and the algorithm that solves it — **HyperLogLog** — is one of the cleverest pieces of applied probability in production software today.

---

## Example

```
Stream: user_1, user_2, user_3, user_1, user_2, user_4, user_1, ...

Exact answer (a real set):     4 unique users
HyperLogLog estimate:          ~4 (small counts have more relative error)

At scale:
10,000 truly unique visitors, including thousands of repeat views
  → HyperLogLog estimate: 10,386   (3.86% error)
  → Memory used: 256 bytes, regardless of whether 10K or 10B events arrived
```

Feed it the same visitor twice, three times, a thousand times — the estimate barely moves. That insensitivity to duplicates *is* the algorithm working correctly.

---

## Why It Matters

Cardinality estimation quietly powers systems you use every day:

| System | What it counts |
| :--- | :--- |
| **Redis** | `PFADD` / `PFCOUNT` — HyperLogLog built directly into the database |
| **Analytics platforms** | Unique visitors, unique searches, unique devices — without storing every ID |
| **Databases** | Query planners estimate `COUNT(DISTINCT col)` to choose a join strategy |
| **Networking** | Estimating the number of distinct flows passing through a router |
| **Security** | Detecting anomalies by tracking distinct source IPs per second, cheaply |

The deeper idea: **you don't need perfect information to make a good engineering decision.** A count that's off by 3% and costs 256 bytes usually beats a count that's exact and costs 4 GB.

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly and count how many flips until you get heads. Getting heads on flip 1 is common. Getting heads only after 20 straight tails is rare — and the *rarer* the streak you observe, the *more* coin flips you can infer probably happened somewhere in the room.

HyperLogLog turns every item into a "coin flip" using a hash function:

1. **Hash each item** into a pseudo-random bit string.
2. **Count leading zeros** in that bit string, plus one. A long run of zeros is rare — like a long streak of tails.
3. **Track the longest streak seen.** If the longest run of leading zeros observed is `k`, that suggests roughly `2^k` distinct items were hashed (because you'd need that many "coin flips" to expect a streak that long).

A single streak is a noisy estimate. So HyperLogLog splits the hash into two parts:
- A few bits pick one of `m` **buckets** (like sorting flips into separate jars).
- The rest of the bits are used for the leading-zero count *within* that bucket.

Each bucket independently tracks its own longest streak. Averaging across all `m` buckets (using a harmonic mean, which is resistant to outliers) cancels out the noise and gives a tight estimate — accurate to roughly `1.04 / √m`.

### Step-by-Step Walkthrough

```
1. hash("user_42") → 32-bit number, e.g. 0b00010110...01
2. Use the low 8 bits to pick a bucket:  bucket = hash & 0xFF   → e.g. bucket 22
3. Use the remaining 24 bits to count leading zeros + 1 → rank, e.g. rank = 3
4. buckets[22] = max(buckets[22], 3)   ← only remember the biggest rank ever seen

Repeat for every item in the stream — duplicates hash identically,
so they never raise a bucket's max. That's why repeats are free.

Finally:
  estimate = alpha_constant * (num_buckets^2) / sum(2^-rank for each bucket)
```

With 256 buckets (1 byte per bucket, storing a rank), this needs only **256 bytes** total — the same memory whether you've counted 10 thousand or 10 billion items.

---

## Code

### Python

```python
import hashlib


class HyperLogLog:
    def __init__(self, bucket_bits=8):
        self.bucket_bits = bucket_bits
        self.num_buckets = 1 << bucket_bits  # 256 buckets by default
        self.buckets = [0] * self.num_buckets
        self.alpha = 0.7213 / (1 + 1.079 / self.num_buckets)

    def _hash32(self, value):
        digest = hashlib.sha1(str(value).encode()).digest()
        return int.from_bytes(digest[:4], "big")

    def _leading_zeros(self, x, bit_width):
        if x == 0:
            return bit_width
        count = 0
        mask = 1 << (bit_width - 1)
        while mask and not (x & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, value):
        h = self._hash32(value)
        bucket_index = h & (self.num_buckets - 1)          # low bits pick the bucket
        remaining_bits = 32 - self.bucket_bits
        remaining = h >> self.bucket_bits
        rank = self._leading_zeros(remaining, remaining_bits) + 1
        if rank > self.buckets[bucket_index]:
            self.buckets[bucket_index] = rank              # keep only the longest streak

    def count(self):
        harmonic_sum = sum(2.0 ** -r for r in self.buckets)
        estimate = self.alpha * (self.num_buckets ** 2) / harmonic_sum
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog()
    unique_visitors = 10_000

    for i in range(unique_visitors):
        hll.add(f"user_{i}")

    # Feed in 5,000 repeats — they must not move the estimate
    for i in range(5_000):
        hll.add(f"user_{i}")

    estimate = hll.count()
    error = abs(estimate - unique_visitors) / unique_visitors * 100

    print(f"Actual unique visitors: {unique_visitors}")
    print(f"Estimated count:        {estimate}")
    print(f"Error:                  {error:.2f}%")
    print(f"Memory used:            {len(hll.buckets)} bytes")
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
    constructor(bucketBits = 8) {
        this.bucketBits = bucketBits;
        this.numBuckets = 1 << bucketBits; // 256 buckets by default
        this.buckets = new Array(this.numBuckets).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.numBuckets);
    }

    _hash32(value) {
        const digest = crypto.createHash("sha1").update(String(value)).digest();
        return digest.readUInt32BE(0);
    }

    _leadingZeros(x, bitWidth) {
        if (x === 0) return bitWidth;
        let count = 0;
        let mask = 1 << (bitWidth - 1);
        while (mask && !(x & mask)) {
            count++;
            mask >>>= 1;
        }
        return count;
    }

    add(value) {
        const h = this._hash32(value);
        const bucketIndex = h & (this.numBuckets - 1); // low bits pick the bucket
        const remainingBits = 32 - this.bucketBits;
        const remaining = h >>> this.bucketBits;
        const rank = this._leadingZeros(remaining, remainingBits) + 1;
        if (rank > this.buckets[bucketIndex]) {
            this.buckets[bucketIndex] = rank; // keep only the longest streak
        }
    }

    count() {
        const harmonicSum = this.buckets.reduce((sum, r) => sum + 2 ** -r, 0);
        const estimate = (this.alpha * this.numBuckets ** 2) / harmonicSum;
        return Math.round(estimate);
    }
}

const hll = new HyperLogLog();
const uniqueVisitors = 10_000;

for (let i = 0; i < uniqueVisitors; i++) {
    hll.add(`user_${i}`);
}

// Feed in 5,000 repeats — they must not move the estimate
for (let i = 0; i < 5_000; i++) {
    hll.add(`user_${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - uniqueVisitors) / uniqueVisitors) * 100;

console.log(`Actual unique visitors: ${uniqueVisitors}`);
console.log(`Estimated count:        ${estimate}`);
console.log(`Error:                  ${error.toFixed(2)}%`);
console.log(`Memory used:            ${hll.buckets.length} bytes`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insert | One hash, one bucket update — independent of how many items came before |
| **Space** | O(m) — constant | `m` buckets (256 in this example) store the whole structure, whether you've seen 10 items or 10 billion |

Compare that to an exact `set()`: O(n) time to build and **O(n) space** — memory grows forever with the stream. HyperLogLog trades a small, well-understood error (~`1.04/√m`) for memory that never grows. Real implementations (like Redis) also fall back to exact counting or linear counting for very small cardinalities, where the streak-based estimate is noisiest — a detail worth knowing before you trust it blindly on small datasets.

---

## One Minute Insight

> **You can measure the size of a haystack without keeping every needle.** HyperLogLog never remembers *what* it saw — only the rarest pattern it stumbled into. That single number, replicated across a handful of independent buckets, is enough to reconstruct scale.

The deeper lesson generalizes past counting: whenever exact tracking is too expensive, look for a statistic that's cheap to update, forgets duplicates for free, and whose *extremes* — not its average — carry the signal. That's the same instinct behind reservoir sampling and Bloom filters: don't store the data, store a fingerprint of its shape.

*Run `code.py` or `code.js` to see it in action.*
