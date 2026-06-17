# Counting Without Counting: The HyperLogLog Trick

> *"How many unique visitors did we get today?" — The answer lives in 12 kilobytes, whether your answer is 10,000 or 10 billion."*

---

## The Problem

Your analytics pipeline processes **1 billion page views per day**. You want to know: how many **unique users** visited?

The naive approach: throw every user ID into a hash set and call `.len()`. Clean. Correct. And with 1B users × 16 bytes per UUID, that's **~16 GB of RAM** — for a single daily count.

What if you could answer that question with **~1.5 KB of memory**, with an error margin of only 0.8%?

That's exactly what **HyperLogLog (HLL)** does — the probabilistic algorithm behind `PFCOUNT` in Redis, `approx_count_distinct` in BigQuery, and cardinality estimation in Apache Spark and PostgreSQL.

---

## Example

```
Stream: ["alice", "bob", "alice", "carol", "bob", "bob", "dave", "alice"]
Exact distinct count: 4

HyperLogLog estimate: ~4 (with <1% error at scale)

At 1 billion elements:
  Exact set: ~8 GB RAM
  HyperLogLog: ~12 KB RAM (error: ~0.8%)
```

---

## Why It Matters

| System | Use Case |
|---|---|
| **Redis** | `PFADD` / `PFCOUNT` — exact HyperLogLog implementation |
| **BigQuery** | `APPROX_COUNT_DISTINCT()` for fast analytics queries |
| **Apache Spark** | `countApproxDistinct()` in streaming aggregations |
| **PostgreSQL** | `hll` extension for large-scale analytics |
| **Elasticsearch** | `cardinality` aggregation for index analytics |
| **Twitter/Meta** | Real-time trending topic cardinality estimation |

Whenever counting exact distinct values is too expensive, HyperLogLog steps in — trading a tiny margin of error for a thousand-fold reduction in memory.

---

## Solution

**The Brilliant Insight: Coin Flips as Counters**

Imagine hashing each element to a binary string. Binary strings, when generated uniformly at random, behave like coin flips.

If you flip coins until you get heads, the expected streak of tails before the first heads is:
- 50% chance: streak of 0 tails (first flip is heads)
- 25% chance: streak of 1 tail
- 12.5% chance: streak of 2 tails
- ...
- 1/2^k chance: streak of k tails

**Key insight**: if the longest streak of leading zeros you've ever seen in any hash is `k`, you've probably seen around `2^k` distinct elements.

Seen a max run of 3 zeros? You've probably seen ~8 distinct items.
Seen a max run of 20 zeros? You've probably seen ~1 million distinct items.

**But one register is noisy.** HyperLogLog fixes this with:
1. Split elements into `m` independent sub-streams using the first few hash bits
2. Track the max leading zeros in each sub-stream (each sub-stream = one "register")
3. Combine using **harmonic mean** to cancel out outliers
4. Apply a small correction factor for bias near 0 and near capacity

**Walkthrough:**
- Use `m = 2^b` registers (typical: `b = 14` → 16,384 registers, 12 KB)
- Hash each element → first `b` bits select the register → remaining bits count leading zeros
- Each register stores only a 5-bit integer (max leading zeros 0–31)
- Final estimate: `α × m² × harmonic_mean(2^(-register[i]))`

The harmonic mean is what makes this work — it's resistant to outliers, so one freak hash with 30 leading zeros doesn't completely destroy your estimate.

---

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    def __init__(self, b: int = 14):
        # b controls accuracy vs memory: m = 2^b registers
        # b=14 → 16384 registers, ~12 KB, ~0.81% error
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m

    def _hash(self, item: str) -> int:
        return int(hashlib.sha256(item.encode()).hexdigest(), 16)

    def _leading_zeros(self, bits: int, width: int) -> int:
        if bits == 0:
            return width
        return width - bits.bit_length() + 1

    def add(self, item: str):
        h = self._hash(item)
        register_idx = h >> (256 - self.b)
        remaining = h & ((1 << (256 - self.b)) - 1)
        run = self._leading_zeros(remaining, 256 - self.b)
        self.registers[register_idx] = max(self.registers[register_idx], run)

    def count(self) -> int:
        alpha = 0.7213 / (1 + 1.079 / self.m)
        raw = alpha * self.m ** 2 / sum(2 ** (-r) for r in self.registers)

        # Small range correction
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))

        return round(raw)

    def __repr__(self):
        mem_bytes = self.m * 5 / 8
        return f"HyperLogLog(b={self.b}, registers={self.m}, memory~{mem_bytes/1024:.1f} KB, error~{100 * 1.04 / self.m**0.5:.2f}%)"


if __name__ == "__main__":
    hll = HyperLogLog(b=14)
    print(hll)

    import random
    import string

    def random_id():
        return ''.join(random.choices(string.ascii_lowercase, k=12))

    actual = set()
    for _ in range(1_000_000):
        uid = random_id()
        actual.add(uid)
        hll.add(uid)

    print(f"Exact count:      {len(actual):,}")
    print(f"HyperLogLog est:  {hll.count():,}")
    error = abs(hll.count() - len(actual)) / len(actual) * 100
    print(f"Error:            {error:.2f}%")
```

---

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 14) {
    // b=14 → 16384 registers, ~12 KB, ~0.81% standard error
    this.b = b;
    this.m = 1 << b;
    this.registers = new Uint8Array(this.m);
  }

  #hash(item) {
    return BigInt("0x" + crypto.createHash("sha256").update(item).digest("hex"));
  }

  #leadingZeros(bits, width) {
    if (bits === 0n) return width;
    let count = 0;
    let mask = 1n << BigInt(width - 1);
    while (mask > 0n && (bits & mask) === 0n) {
      count++;
      mask >>= 1n;
    }
    return count + 1;
  }

  add(item) {
    const h = this.#hash(item);
    const registerIdx = Number(h >> BigInt(256 - this.b));
    const remaining = h & ((1n << BigInt(256 - this.b)) - 1n);
    const run = this.#leadingZeros(remaining, 256 - this.b);
    this.registers[registerIdx] = Math.max(this.registers[registerIdx], run);
  }

  count() {
    const alpha = 0.7213 / (1 + 1.079 / this.m);
    const rawEstimate = alpha * this.m ** 2 /
      this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);

    // Small range correction
    const zeros = this.registers.filter((r) => r === 0).length;
    if (rawEstimate <= 2.5 * this.m && zeros > 0) {
      return Math.round(this.m * Math.log(this.m / zeros));
    }

    return Math.round(rawEstimate);
  }

  toString() {
    const memKB = ((this.m * 5) / 8 / 1024).toFixed(1);
    const error = ((100 * 1.04) / Math.sqrt(this.m)).toFixed(2);
    return `HyperLogLog(b=${this.b}, registers=${this.m}, memory~${memKB} KB, error~${error}%)`;
  }
}

const hll = new HyperLogLog(14);
console.log(hll.toString());

const actual = new Set();
for (let i = 0; i < 1_000_000; i++) {
  const uid = Math.random().toString(36).slice(2, 14);
  actual.add(uid);
  hll.add(uid);
}

console.log(`Exact count:     ${actual.size.toLocaleString()}`);
console.log(`HyperLogLog est: ${hll.count().toLocaleString()}`);
const error = (Math.abs(hll.count() - actual.size) / actual.size * 100).toFixed(2);
console.log(`Error:           ${error}%`);
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| **add(item)** | O(1) | — |
| **count()** | O(m) | — |
| **Storage** | — | O(m) = O(2^b) bytes |

At `b = 14`: **16,384 registers × 5 bits = ~12 KB** regardless of how many billions of elements you've added.

Compare to exact counting:
| Approach | 1M distinct items | 1B distinct items |
|---|---|---|
| **Hash set** | ~64 MB | ~64 GB |
| **HyperLogLog (b=14)** | ~12 KB | ~12 KB |
| **Error** | 0% | 0% vs **~0.81%** |

HyperLogLog's memory usage is **constant** — it doesn't grow with the number of elements.

---

## One Minute Insight

> HyperLogLog teaches a profound engineering principle: **sometimes 99.2% correct with 1/5,000,000 the memory beats 100% correct at any cost**. The key to the algorithm isn't just probabilistic math — it's the harmonic mean, which dampens outliers the same way it dampens a single overperforming server in a load balancer. Next time your analytics query says `approx_count_distinct`, you're not getting a lazy answer — you're getting a masterpiece of applied probability running in constant space.
