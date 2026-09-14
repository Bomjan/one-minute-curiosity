# Counting a Billion Things With One Kilobyte

How does Redis tell you "12.3 million unique visitors today" without ever storing 12.3 million visitor IDs? The answer is a beautifully weird trick built on coin flips.

---

## The Problem

You're running a website that gets **billions** of hits a day, and you need to answer one question: *how many unique visitors did we see?*

The obvious approach — dump every visitor ID into a `Set` — works great until it doesn't. A set of a billion unique 36-byte UUIDs eats tens of gigabytes of RAM, per metric, per day. Multiply that across "unique searches," "unique IPs," "unique products viewed," and your database falls over.

**The challenge:** estimate the number of *distinct* items in a massive stream, using memory that barely grows even as the stream grows to infinity. A small error (1-3%) is totally fine — you just can't afford to remember everything.

---

## Example

```
Stream: user-1, user-2, user-1, user-3, user-2, user-4, user-1, ...
                (billions of events, lots of repeats)

Exact answer:      "unique users" = size of a giant hash set
HyperLogLog answer: ~1 KB of memory, one pass, ±2-3% error

add("user-1") add("user-2") add("user-1") add("user-3") ...
count() → 100,347   (actual unique count: 100,000)
```

You trade a tiny, bounded amount of accuracy for a memory footprint that stays flat whether you're counting a thousand items or a trillion.

---

## Why It Matters

This isn't a toy — it's running in production right now:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Redis's `PFADD` / `PFCOUNT` commands are HyperLogLog under the hood |
| **Analytics** | Google BigQuery's `APPROX_COUNT_DISTINCT`, Presto, and Elasticsearch cardinality aggregations |
| **Distributed systems** | Merging sketches from many machines gives a global unique count with zero coordination |
| **Networking** | Estimating the number of distinct flows or source IPs hitting a router, for DDoS detection |
| **AI / data pipelines** | Deduplication estimates over massive training corpora without a full dedup pass |

The deeper lesson: **when "exact" is too expensive, a clever approximation with provable error bounds is often the right engineering answer.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly until you get heads. If you only flipped it once, that's common. If it took 20 flips to get heads, that's *rare* — and rare events like that are more likely to happen when you've made *many* attempts.

HyperLogLog turns every item into a coin-flip sequence using a hash function:

1. **Hash the item** into a random-looking bit string.
2. **Count the leading zero bits** before the first `1` (this is the "number of tails before heads").
3. **Track the longest run of leading zeros ever seen.** If the longest run is `k`, you probably saw roughly `2^k` distinct items — because it takes that many tries, on average, to witness a run that long.

A single "longest run" estimate is noisy, so instead of one counter, HyperLogLog splits the hash into `m` independent **buckets** (registers), each tracking its own longest run. Averaging across all `m` buckets (using a harmonic mean, which is robust to outliers) turns a noisy single guess into a tight estimate — with error shrinking as `~1.04/√m`.

### Step-by-Step Walkthrough

```
1. Pick m = 1024 registers (all start at 0)         → ~1 KB of memory

2. For each incoming item:
     hash = MD5(item)                    # 32 random-looking bits
     bucket = first 10 bits of hash      # which of the 1024 registers?
     rest   = remaining 22 bits
     run    = leading zeros in `rest` + 1
     registers[bucket] = max(registers[bucket], run)

3. To estimate the count:
     harmonic_mean = Σ 2^(-registers[i])  for all i
     estimate = alpha * m² / harmonic_mean
```

No item is ever stored. Only 1024 small integers (the longest run seen per bucket) live in memory — forever, regardless of stream size.

---

## Code

### Python

```python
import hashlib


def _hash(value: str) -> int:
    """Turn any string into a well-mixed 32-bit integer."""
    digest = hashlib.md5(value.encode()).digest()
    return int.from_bytes(digest[:4], "big")


def _rho(bits: int, max_bits: int) -> int:
    """Position of the leftmost 1-bit (1-indexed). All zeros -> max_bits + 1."""
    for i in range(max_bits - 1, -1, -1):
        if bits & (1 << i):
            return max_bits - i
    return max_bits + 1


class HyperLogLog:
    def __init__(self, precision: int = 10):
        self.p = precision
        self.m = 1 << precision  # number of registers, e.g. 1024
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant

    def add(self, item: str) -> None:
        h = _hash(item)
        index = h >> (32 - self.p)  # first p bits pick a "bucket"
        remaining = h & ((1 << (32 - self.p)) - 1)
        run = _rho(remaining, 32 - self.p)  # longest run of leading zeros seen
        self.registers[index] = max(self.registers[index], run)

    def count(self) -> int:
        harmonic_mean = sum(2**-reg for reg in self.registers)
        estimate = self.alpha * self.m * self.m / harmonic_mean
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers ≈ 1 KB of memory

    unique_visitors = 100_000
    for i in range(unique_visitors):
        hll.add(f"user-{i}")

    print(f"Estimated unique visitors: {hll.count()}")
    print(f"Actual unique visitors:    {unique_visitors}")
```

### JavaScript

```javascript
const crypto = require('crypto');

function hash(value) {
    // Turn any string into a well-mixed 32-bit integer.
    const digest = crypto.createHash('md5').update(value).digest();
    return digest.readUInt32BE(0);
}

function rho(bits, maxBits) {
    // Position of the leftmost 1-bit (1-indexed). All zeros -> maxBits + 1.
    for (let i = maxBits - 1; i >= 0; i--) {
        if (bits & (1 << i)) return maxBits - i;
    }
    return maxBits + 1;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;
        this.m = 1 << precision; // number of registers, e.g. 1024
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m); // bias-correction constant
    }

    add(item) {
        const h = hash(item) >>> 0;
        const index = h >>> (32 - this.p); // first p bits pick a "bucket"
        const remaining = h & ((1 << (32 - this.p)) - 1);
        const run = rho(remaining, 32 - this.p); // longest run of leading zeros seen
        this.registers[index] = Math.max(this.registers[index], run);
    }

    count() {
        const harmonicMean = this.registers.reduce((sum, reg) => sum + Math.pow(2, -reg), 0);
        const estimate = (this.alpha * this.m * this.m) / harmonicMean;
        return Math.round(estimate);
    }
}

const hll = new HyperLogLog(10); // 1024 registers ≈ 1 KB of memory

const uniqueVisitors = 100000;
for (let i = 0; i < uniqueVisitors; i++) {
    hll.add(`user-${i}`);
}

console.log(`Estimated unique visitors: ${hll.count()}`);
console.log(`Actual unique visitors:    ${uniqueVisitors}`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `add`, O(m) for `count` | Each insert hashes once and updates one register; the final estimate sums all `m` registers |
| **Space** | O(m), independent of stream size | `m` small integers (registers) — counting a billion items costs the same memory as counting a thousand |

Compare that to a hash set: **O(n)** space, growing forever with the number of unique items. HyperLogLog trades a small, well-understood error (`~1.04/√m`, about 3% at `m=1024`) for memory that never grows.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** The rarest thing you've observed carries information about everything you didn't observe — a run of 20 leading zeros is a fingerprint of scale, not a fluke to be stored.

This is the same intuition behind sampling, sketching, and reservoir algorithms: trade certainty for a bounded, provable approximation, and get O(1) memory in return. When your data is too big to hold, ask what a *statistic* of it can tell you instead.

*Run `code.py` or `code.js` to see it in action.*
