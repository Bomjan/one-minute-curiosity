# The Counter That Doesn't Count

> *"I've seen roughly a billion unique things. I can't tell you which ones — but I'll tell you how many, within 2%, using 12 kilobytes."*

---

## The Problem

Your analytics pipeline processes **1 billion page views per day**. Product asks: *"How many unique users visited today?"*

The obvious answer — throw every user ID into a hash set — costs you **~8 GB of RAM** for a billion 64-bit IDs. Scale that to 10 servers, add string IDs, add per-page breakdowns, and you've burned your entire memory budget on a single metric.

**Can you count a billion distinct items using only ~12 KB of memory?**

Yes — with **HyperLogLog**.

HyperLogLog doesn't store items. It doesn't even store approximations of items. It exploits a beautiful probabilistic trick: **the rarest pattern in random data reveals how much data you've seen.**

---

## Example

```
Stream: user_1, user_2, user_3, user_1, user_2, user_99, ...

Hash each item to a random-looking binary string:
  user_1  → 00110101...   (2 leading zeros  → run length = 3)
  user_2  → 01001101...   (1 leading zero   → run length = 2)
  user_3  → 00001101...   (4 leading zeros  → run length = 5)
  user_1  → 00110101...   (duplicate — same hash, no change)
  user_99 → 00000010...   (6 leading zeros  → run length = 7)

Max run length seen = 7
Rough estimate of distinct items = 2^7 = 128

(Real HyperLogLog splits into 1024 registers and harmonically averages
 across all of them — giving ~1.5% typical error instead of ±50%)
```

---

## Why It Matters

HyperLogLog is not a toy — it's infrastructure:

| System | Use Case |
|---|---|
| **Redis** | `PFCOUNT` — count unique visitors, unique IPs, unique events |
| **PostgreSQL** | `pg_hll` extension for approximate `COUNT DISTINCT` |
| **Apache Spark** | `approx_count_distinct()` for big data aggregations |
| **Apache Flink** | Real-time streaming cardinality estimation |
| **Google** | Original paper authors — used internally since 2007 |
| **Cloudflare** | Counting unique IPs per zone at DNS-query scale |

The engineering payoff: **12 KB instead of 8 GB** for a billion unique items, with a predictable ~1.5% error margin you can tune up or down.

---

## Solution

**The core insight — lucky streaks in coin flips:**

If you flip a fair coin and track the longest streak of heads before seeing tails, longer streaks suggest you flipped more times. A streak of 1 is common. A streak of 10 takes ~1024 flips on average. Seeing a streak of k implies roughly 2^k flips.

Hashing items to binary strings is the same game — each hash is a "random" coin flip sequence. The longest run of leading zeros you've ever seen is a proxy for how many distinct items you've hashed.

**Why multiple registers?**

One register gives you a wild estimate — one lucky streak of 20 leading zeros would make you think you've seen a million items when you've seen three. HyperLogLog fixes this by:

1. Splitting the hash into a **register index** (first `b` bits) and **run value** (remaining bits)
2. Maintaining `m = 2^b` independent registers, each tracking its own max run
3. Using the **harmonic mean** of `2^(-register)` values to cancel out lucky outliers

**Walkthrough:**
- Pick `b = 10` → 1024 registers → ~1 KB storage
- For each new item: hash it → top 10 bits pick a register → count leading zeros in the rest → update that register if it's a new maximum
- To estimate: compute `alpha × m² / Σ(2^(-register[i]))` — the bias-corrected harmonic mean
- Result: typical error of **1.5%** across a range from hundreds to billions

The bias-correction constant `alpha` is derived from integration of the Poisson process — the math is heavy, but the implementation is just a lookup table.

---

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b           # register index bits
        self.m = 1 << b      # number of registers = 2^b
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    def _alpha(self, m):
        if m == 16: return 0.673
        if m == 32: return 0.697
        if m == 64: return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item):
        return int(hashlib.sha256(str(item).encode()).hexdigest(), 16)

    def _leading_zeros(self, value, max_bits):
        if value == 0:
            return max_bits
        return max_bits - value.bit_length()

    def add(self, item):
        h = self._hash(item)
        register_index = h >> (256 - self.b)
        remainder = h & ((1 << (256 - self.b)) - 1)
        run_length = self._leading_zeros(remainder, 256 - self.b) + 1
        self.registers[register_index] = max(self.registers[register_index], run_length)

    def count(self):
        z = sum(2 ** -r for r in self.registers)
        return int(self.alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 registers ≈ 1 KB

    actual = 100_000
    for i in range(actual):
        hll.add(f"user_{i}")

    for i in range(50_000):
        hll.add(f"user_{i}")  # duplicates must not inflate the count

    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique items : {actual:,}")
    print(f"HyperLogLog estimate: {estimate:,}")
    print(f"Error               : {error:.2f}%")
    print(f"Memory (registers)  : {hll.m} bytes")
```

---

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b;                    // number of registers = 2^b
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
    return BigInt(
      "0x" + crypto.createHash("sha256").update(String(item)).digest("hex")
    );
  }

  #leadingZeros(value, bits) {
    if (value === 0n) return bits;
    let count = 0;
    let mask = 1n << BigInt(bits - 1);
    while ((value & mask) === 0n) {
      count++;
      mask >>= 1n;
    }
    return count;
  }

  add(item) {
    const h = this.#hash(item);
    const remainingBits = 256 - this.b;
    const registerIndex = Number(h >> BigInt(remainingBits));
    const remainder = h & ((1n << BigInt(remainingBits)) - 1n);
    const runLength = this.#leadingZeros(remainder, remainingBits) + 1;
    this.registers[registerIndex] = Math.max(
      this.registers[registerIndex],
      runLength
    );
  }

  count() {
    let z = 0;
    for (const r of this.registers) z += Math.pow(2, -r);
    return Math.round(this.alpha * this.m * this.m / z);
  }
}

const hll = new HyperLogLog(10);
const actual = 100_000;

for (let i = 0; i < actual; i++) hll.add(`user_${i}`);
for (let i = 0; i < 50_000; i++) hll.add(`user_${i}`);  // duplicates

const estimate = hll.count();
const error = ((Math.abs(estimate - actual) / actual) * 100).toFixed(2);

console.log(`Actual unique items : ${actual.toLocaleString()}`);
console.log(`HyperLogLog estimate: ${estimate.toLocaleString()}`);
console.log(`Error               : ${error}%`);
console.log(`Memory (registers)  : ${hll.m} bytes`);
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| **Add item** | O(1) | — |
| **Count estimate** | O(m) | — |
| **Storage** | — | O(m) = O(2^b) bytes |

The `count()` pass over `m` registers is O(m) — but `m` is a constant you choose at construction time (typically 1024 or 4096), so it's effectively O(1) per query regardless of how many items you've added.

**Memory vs. accuracy trade-off:**

| b | Registers (m) | Memory | Typical Error |
|---|---|---|---|
| 8  | 256    | 256 B  | ~3.2% |
| 10 | 1,024  | 1 KB   | ~1.6% |
| 12 | 4,096  | 4 KB   | ~0.8% |
| 14 | 16,384 | 16 KB  | ~0.4% |

Compare to an exact hash set counting 1 billion 64-bit IDs: **8 GB**. HyperLogLog with `b=14` gives **16 KB** and 0.4% error. That's a 500,000× memory reduction.

---

## One Minute Insight

> HyperLogLog is the engineering art of asking the right question at the right resolution. Exact answers are expensive. Approximate answers — with known, bounded error — are almost always good enough. Redis stores the daily unique-visitor count for millions of websites in the same memory that a naive solution would use for three users. The next time a product manager asks for "exact" counts on a billion-scale dataset, ask them: *what decision changes if the answer is 1% off?* Usually, none. That's HyperLogLog's real insight — not the math, but the mindset.
