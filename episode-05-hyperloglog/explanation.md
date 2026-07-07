# Counting a Billion Without Storing a Single One

> *"We don't need to remember every face in the crowd — we just need to remember the most surprising one."*

---

## The Problem

Your API logs 500 million requests per day. Your boss walks in and asks: **"How many unique users did we serve this month?"**

The naive answer: dump every user ID into a set and call `len()`. Simple.

The brutal reality: 500M × 30 days = **15 billion events**. A hash set storing 8-byte user IDs needs **~120 GB of RAM** just for one month's cardinality estimate.

What if you could answer that question with **~1.5 KB of memory** and a **2% error margin**?

That's **HyperLogLog** — the probabilistic cardinality estimation algorithm powering Redis, BigQuery, Postgres, and Splunk.

---

## Example

```
Estimate distinct count among: [A, B, A, C, A, B, D, C, E, A]

True distinct count: 5  (A, B, C, D, E)

HyperLogLog estimate: ~5  (within 2%)

Memory used: O(log log n) per register
Total memory: ~1.5 KB for billions of elements
```

---

## Why It Matters

| System | Use Case |
|---|---|
| **Redis** | `PFADD` / `PFCOUNT` — built-in HyperLogLog commands |
| **Google BigQuery** | `APPROX_COUNT_DISTINCT()` — trillion-row cardinality in seconds |
| **PostgreSQL** | Extension for fast distinct aggregates |
| **Splunk** | Counting unique IPs, sessions, events at log scale |
| **Apache Flink** | Real-time stream analytics |

Anywhere you'd write `COUNT(DISTINCT ...)` on massive data, HyperLogLog is the cheat code. A 2% error in exchange for 4-5 orders of magnitude less memory is usually a business win.

---

## Solution

**The key insight** comes from a beautiful probabilistic observation:

> If you hash elements uniformly, and look at the **position of the first `1` bit** in each hash (i.e., count leading zeros), the *maximum* number of leading zeros you observe is a rough estimator of `log₂(n)` — where `n` is the number of distinct elements.

Think of it like flipping a fair coin until you get heads:
- Seeing 1 flip → not surprising (you've seen maybe 2 distinct things)
- Seeing 10 flips → you've seen roughly 2¹⁰ = 1024 distinct things
- Seeing 20 flips → roughly 1 million distinct things

**But one estimate is noisy.** HyperLogLog fixes this by:

1. **Splitting** the hash space into `m` buckets (sub-streams) using the first `b` bits of the hash
2. **Tracking** the max leading-zero count per bucket
3. **Combining** all buckets using the **harmonic mean** (robust to outliers)

The final formula:

```
estimate = α_m × m² × (Σ 2^(-M[j]))^(-1)
```

Where `M[j]` is the max leading zeros in bucket `j`, and `α_m` is a small bias-correction constant.

**Standard error**: `1.04 / √m`
- 16 buckets → ~26% error
- 1024 buckets → ~3.25% error  
- 4096 buckets → ~1.6% error (uses ~5 KB)
- 65536 buckets → ~0.4% error (uses ~80 KB)

The "HyperLog" part: you only store `log(log(n))` bits per bucket — the max leading zero count never exceeds ~64 for a 64-bit hash.

---

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    def __init__(self, error_rate: float = 0.02):
        # Number of registers derived from desired error rate: 1.04/sqrt(m)
        self.b = max(4, math.ceil(math.log2((1.04 / error_rate) ** 2)))
        self.m = 1 << self.b
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    def _alpha(self, m: int) -> float:
        if m == 16:   return 0.673
        if m == 32:   return 0.697
        if m == 64:   return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item: str) -> int:
        return int(hashlib.sha256(item.encode()).hexdigest(), 16)

    def _leading_zeros(self, bits: int, max_bits: int) -> int:
        if bits == 0:
            return max_bits + 1
        count = 1
        while (bits & (1 << (max_bits - 1))) == 0:
            bits <<= 1
            count += 1
        return count

    def add(self, item: str):
        h = self._hash(item)
        register_idx = h >> (256 - self.b)
        remaining = (h << self.b) & ((1 << 256) - 1)
        leading = self._leading_zeros(remaining, 256 - self.b)
        self.registers[register_idx] = max(self.registers[register_idx], leading)

    def count(self) -> int:
        raw = self.alpha * self.m ** 2 * sum(2 ** -r for r in self.registers) ** -1

        # Small range correction
        if raw <= 2.5 * self.m:
            zeros = self.registers.count(0)
            if zeros > 0:
                return round(self.m * math.log(self.m / zeros))

        return round(raw)

    def __repr__(self):
        memory_bytes = self.m  # 1 byte per register
        return (
            f"HyperLogLog(registers={self.m}, "
            f"error≈{1.04 / math.sqrt(self.m):.1%}, "
            f"memory={memory_bytes} bytes)"
        )


if __name__ == "__main__":
    hll = HyperLogLog(error_rate=0.02)
    print(hll)

    import random
    import string

    n_distinct = 100_000
    user_ids = [f"user_{i}" for i in range(n_distinct)]

    for uid in user_ids:
        hll.add(uid)

    # Add duplicates — should not change the count
    for uid in random.sample(user_ids, 10_000):
        hll.add(uid)

    estimate = hll.count()
    error = abs(estimate - n_distinct) / n_distinct
    print(f"True distinct: {n_distinct:,}")
    print(f"HLL estimate:  {estimate:,}")
    print(f"Error:         {error:.2%}")
```

---

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
  constructor(errorRate = 0.02) {
    this.b = Math.max(4, Math.ceil(Math.log2((1.04 / errorRate) ** 2)));
    this.m = 1 << this.b;
    this.registers = new Uint8Array(this.m);
    this.alpha = this.#alpha(this.m);
  }

  #alpha(m) {
    if (m === 16) return 0.673;
    if (m === 32) return 0.697;
    if (m === 64) return 0.709;
    return 0.7213 / (1 + 1.079 / m);
  }

  #hash(item) {
    return BigInt("0x" + crypto.createHash("sha256").update(item).digest("hex"));
  }

  #leadingZeros(bits, maxBits) {
    if (bits === 0n) return maxBits + 1;
    let count = 1;
    const top = 1n << BigInt(maxBits - 1);
    while ((bits & top) === 0n) {
      bits <<= 1n;
      count++;
    }
    return count;
  }

  add(item) {
    const h = this.#hash(item);
    const idx = Number(h >> BigInt(256 - this.b));
    const remaining = (h << BigInt(this.b)) & ((1n << 256n) - 1n);
    const leading = this.#leadingZeros(remaining, 256 - this.b);
    this.registers[idx] = Math.max(this.registers[idx], leading);
  }

  count() {
    const raw =
      this.alpha *
      this.m ** 2 *
      (this.registers.reduce((sum, r) => sum + 2 ** -r, 0) ** -1);

    // Small range correction
    if (raw <= 2.5 * this.m) {
      const zeros = this.registers.filter((r) => r === 0).length;
      if (zeros > 0) return Math.round(this.m * Math.log(this.m / zeros));
    }

    return Math.round(raw);
  }

  toString() {
    const errorApprox = (1.04 / Math.sqrt(this.m) * 100).toFixed(1);
    return `HyperLogLog(registers=${this.m}, error≈${errorApprox}%, memory=${this.m} bytes)`;
  }
}

const hll = new HyperLogLog(0.02);
console.log(hll.toString());

const nDistinct = 100_000;
for (let i = 0; i < nDistinct; i++) hll.add(`user_${i}`);

// Duplicates — shouldn't change estimate
for (let i = 0; i < 10_000; i++) hll.add(`user_${Math.floor(Math.random() * nDistinct)}`);

const estimate = hll.count();
const error = (Math.abs(estimate - nDistinct) / nDistinct * 100).toFixed(2);
console.log(`True distinct: ${nDistinct.toLocaleString()}`);
console.log(`HLL estimate:  ${estimate.toLocaleString()}`);
console.log(`Error:         ${error}%`);
```

---

## Complexity

| | HyperLogLog | Exact Hash Set |
|---|---|---|
| **Add** | O(1) | O(1) amortized |
| **Count** | O(m) | O(1) |
| **Space** | O(m) ≈ **1.5 KB** | O(n) ≈ **120 GB** for 15B items |
| **Accuracy** | ~2% error | Exact |

Where `m` is the number of registers (a constant you choose, typically 4096–65536).

---

## One Minute Insight

> HyperLogLog is a reminder that **exact answers are expensive, and approximate answers are often good enough**. A 2% error margin on a billion-user cardinality query is meaningless for a product dashboard — but the difference between 120 GB RAM and 1.5 KB is the difference between a $50,000 server and a Raspberry Pi. The best engineers know when "close enough" is actually perfect.
