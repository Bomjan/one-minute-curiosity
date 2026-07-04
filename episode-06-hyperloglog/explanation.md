# How Do You Count a Billion Things With 1KB of Memory?

Google, Redis, and every big analytics dashboard answer "how many unique visitors today?" without ever storing a single visitor. Here's the trick that makes it possible.

---

## The Problem

You want to count **distinct** items in a massive stream — unique visitors, unique IPs, unique search queries. The obvious approach: throw every item into a `Set` and check membership.

That works — until the stream has a billion items. A `Set` of a billion strings can eat **gigabytes** of RAM, just to answer one question: *"how many different things did I see?"*

**Can you estimate the count of unique items using a *fixed*, tiny amount of memory — regardless of whether you see a thousand items or a trillion?**

The catch: you have to give up perfect accuracy. The question is whether ~2% error is a price worth paying for O(1) memory.

---

## Example

```
Stream: user_1, user_2, user_3, ..., user_100000  (100,000 unique users)

Naive Set approach:
  Memory: stores all 100,000 strings → grows forever

HyperLogLog approach:
  Memory: 1,024 tiny counters (registers), fixed size, ~1KB total
  Estimate: 98,232 (real answer: 100,000 → ~1.8% error)
```

The memory footprint for HyperLogLog is **identical** whether the stream has 100 items or 100 billion. That's the whole point.

---

## Why It Matters

Probabilistic cardinality estimation shows up the moment "count of unique X" needs to scale:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Redis's `PFADD` / `PFCOUNT` commands are literally HyperLogLog |
| **Analytics** | "Unique visitors today" on dashboards serving billions of events |
| **Networking** | Estimating distinct IP flows through a router without per-flow state |
| **Distributed systems** | Merging cardinality estimates across shards with simple max() |
| **Big data / AI** | De-duplication estimates over massive training corpora |

The deeper lesson: **when exact answers don't scale, a slightly-wrong answer computed in constant memory is often exactly what production systems need.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin repeatedly until you get heads. If it takes you 20 flips, you probably ran the experiment *many* times — because a run of 20 tails-then-heads is rare.

Hashing an item gives you exactly this kind of coin flip: each bit of the hash is like a coin (0 or 1). **The longer the run of leading zero bits in a hash, the stronger the signal that you've seen a lot of distinct items** — because long zero-runs are statistically rare.

HyperLogLog turns this into an estimator:

1. **Hash** each item into a pseudo-random bit string.
2. **Split** the hash: the first `b` bits pick one of `m = 2^b` "registers" (buckets).
3. **Count** the leading zeros in the rest of the hash, and keep the **maximum** seen so far in that register.
4. **Estimate** total cardinality using the harmonic mean across all registers — harmonic mean because it's resistant to a few registers getting lucky outlier values.

### Step-by-Step Walkthrough

```
Registers: m = 4 (in reality, use 1024+)

Item "A" hashes to: 01 | 101000...   → bucket 01, rest starts with 1 zero → rank 2
Item "B" hashes to: 01 | 001100...   → bucket 01, rest starts with 2 zeros → rank 3
Item "C" hashes to: 10 | 100000...   → bucket 10, rest starts with 0 zeros → rank 1

Registers after processing: [ bucket00: 0, bucket01: 3, bucket10: 1, bucket11: 0 ]
                                          ↑ kept the MAX rank (3), not the sum

Estimate = alpha * m^2 / (sum of 2^-register for each register)
```

Each register only remembers the *longest* zero-run it has ever seen — a single small integer. That's why memory never grows with the stream size.

---

## Code

### Python

```python
import hashlib


class HyperLogLog:
    def __init__(self, num_bucket_bits=10):
        self.b = num_bucket_bits          # bits used to pick a register
        self.m = 1 << num_bucket_bits     # number of registers (e.g. 1024)
        self.registers = [0] * self.m

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).hexdigest()
        return int(digest, 16) & 0xFFFFFFFF  # keep 32 bits

    def _leading_zeros(self, w, width):
        if w == 0:
            return width
        count = 0
        mask = 1 << (width - 1)
        while mask and not (w & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket = x & (self.m - 1)          # first b bits -> which register
        rest = x >> self.b                 # remaining bits -> the "coin flips"
        width = 32 - self.b
        rank = self._leading_zeros(rest, width) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        # Harmonic mean of the registers, corrected by a bias constant (alpha)
        alpha = 0.7213 / (1 + 1.079 / self.m)
        z = sum(2.0 ** -r for r in self.registers)
        return round(alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(num_bucket_bits=10)  # 1024 registers, ~1KB total

    unique_items = [f"user_{i}" for i in range(100_000)]
    for item in unique_items:
        hll.add(item)

    actual = len(unique_items)
    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique count:   {actual}")
    print(f"HyperLogLog estimate:  {estimate}")
    print(f"Error:                 {error:.2f}%")
    print(f"Memory used:           {hll.m} registers (~1KB)")
```

### JavaScript

```javascript
// Simple 32-bit FNV-1a string hash (no external dependencies needed)
function fnv1aHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // unsigned 32-bit
}

class HyperLogLog {
    constructor(numBucketBits = 10) {
        this.b = numBucketBits;           // bits used to pick a register
        this.m = 1 << numBucketBits;      // number of registers (e.g. 1024)
        this.registers = new Uint8Array(this.m);
    }

    _leadingZeros(w, width) {
        if (w === 0) return width;
        let count = 0;
        let mask = 1 << (width - 1);
        while (mask !== 0 && (w & mask) === 0) {
            count++;
            mask >>>= 1;
        }
        return count;
    }

    add(item) {
        const x = fnv1aHash(String(item));
        const bucket = x & (this.m - 1);   // first b bits -> which register
        const rest = x >>> this.b;         // remaining bits -> the "coin flips"
        const width = 32 - this.b;
        const rank = this._leadingZeros(rest, width) + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        // Harmonic mean of the registers, corrected by a bias constant (alpha)
        const alpha = 0.7213 / (1 + 1.079 / this.m);
        let z = 0;
        for (const r of this.registers) z += Math.pow(2, -r);
        return Math.round((alpha * this.m * this.m) / z);
    }
}

const hll = new HyperLogLog(10); // 1024 registers, ~1KB total

const uniqueItems = Array.from({ length: 100000 }, (_, i) => `user_${i}`);
uniqueItems.forEach((item) => hll.add(item));

const actual = uniqueItems.length;
const estimate = hll.count();
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual unique count:   ${actual}`);
console.log(`HyperLogLog estimate:  ${estimate}`);
console.log(`Error:                 ${error.toFixed(2)}%`);
console.log(`Memory used:           ${hll.m} registers (~1KB)`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | One hash + one register update per incoming item |
| **Space** | O(m) — constant | `m` registers (e.g. 1024), independent of the number of items seen |

A `Set`-based exact counter is O(n) in both time *and* space. HyperLogLog trades a small, well-understood statistical error (~1.04/√m, roughly 3% at m=1024) for space that **never grows**, no matter how many items you feed it.

---

## One Minute Insight

> **Rare events are information-dense.** A long run of leading zeros in a hash is unlikely to happen by chance — so when you see one, it tells you something about how many items you've hashed, without needing to remember any of them.

This is the same trick behind reservoir sampling and Bloom filters: instead of storing data, store a *statistic* that correlates with the answer you actually want. When "exact" doesn't fit in memory, "provably close enough" often does — with room to spare.

*Run `code.py` or `code.js` to see it in action.*
