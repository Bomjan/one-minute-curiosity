# Counting a Billion Things With 1.5 KB

## The Problem

Imagine you run a website and want to answer one question: *"How many unique visitors did we have today?"* Sounds trivial — just throw every visitor ID into a `Set` and check its size, right?

Now imagine that website is Google, and "today" means a few billion events. A `Set` of a billion unique IDs eats tens of gigabytes of RAM. You don't have that lying around per metric, per hour, per dashboard widget.

This is the classic **cardinality estimation** problem: count how many *distinct* items passed through a stream, without storing the items themselves. Think of it like guessing how many unique people walked through a stadium turnstile today — you can't remember every face, but a clever bouncer with a notepad and some statistics can get shockingly close.

## Example

```
Input stream (with repeats):  user-1, user-2, user-1, user-3, user-2, user-4, user-1, ...
True unique count:            4

HyperLogLog estimate:         ~4  (with < 2% typical error at scale)
Memory used:                  ~1 KB, regardless of whether the stream has
                               4 items or 4 billion items
```

The memory footprint doesn't grow with the stream — that's the entire point.

## Why It Matters

This isn't academic. **HyperLogLog (HLL)** powers `COUNT(DISTINCT ...)` estimates in Redis (`PFCOUNT`), BigQuery, Presto, Elasticsearch's cardinality aggregation, and analytics pipelines at nearly every large tech company. Anywhere you need "roughly how many unique things" — unique visitors, unique IPs hitting a firewall, unique query terms, distinct devices on a network — HLL gives you a near-instant, constant-memory answer where an exact count would be too slow or too expensive to store.

It's a beautiful example of trading a tiny, well-understood amount of accuracy for an enormous win in space and speed — a trade-off that shows up constantly in real-world systems design.

## Solution

**The clean explanation:** hash every item into a long, effectively random string of bits. A random bit string is equally likely to start with `0`, `00`, `000`, `0000`, and so on — and the *longer* the run of leading zeros you observe, the rarer that event was. If you've seen a hash starting with 20 zeros, you've probably hashed a lot of distinct items, because that's a 1-in-a-million occurrence.

**The optimized thinking:** a single "longest run of zeros seen so far" is a noisy signal — one lucky hash throws it off. So instead of tracking one counter, HLL splits incoming items into many small buckets (say, 1024 of them) using a few bits of the hash, and tracks the longest zero-run *per bucket*. Averaging across all buckets (using a harmonic mean, which is resistant to outliers) smooths out the noise and gives a tight estimate.

**The beginner-friendly walkthrough:**
1. Hash the item into a big number.
2. Use the first few bits of that hash to pick one of `m` registers (buckets).
3. Look at the *rest* of the bits and count how many leading zeros they have, plus one — call this the "rank."
4. Store the rank in that register **only if it's bigger** than what's already there.
5. To estimate the total distinct count, combine all `m` registers with a harmonic-mean formula (with a bias-correction constant tuned for accuracy).

Do this with 1024 registers (10 bits), and you can estimate cardinalities into the billions using about 1 KB of memory and roughly 2% error — a deal no exact-counting structure can match.

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                      # bits used to pick a register
        self.m = 1 << b                 # number of registers (e.g. 1024)
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    @staticmethod
    def _alpha(m):
        if m == 16:
            return 0.673
        if m == 32:
            return 0.697
        if m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / m)

    @staticmethod
    def _hash(item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)

    def add(self, item):
        x = self._hash(item)
        bucket = x & (self.m - 1)          # low bits choose the register
        remaining = x >> self.b            # remaining bits decide the rank
        rank = self._leading_zeros(remaining, width=128 - self.b) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    @staticmethod
    def _leading_zeros(x, width):
        if x == 0:
            return width
        return width - x.bit_length()

    def count(self):
        raw_estimate = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)

        # Small-range correction: fall back to linear counting when
        # most registers are still empty.
        zero_registers = self.registers.count(0)
        if raw_estimate <= 2.5 * self.m and zero_registers > 0:
            return round(self.m * math.log(self.m / zero_registers))

        return round(raw_estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)               # 1024 registers ≈ 1 KB of memory
    true_unique = set()

    for i in range(1_000_000):
        user_id = f"user-{i % 250_000}"   # 250,000 unique IDs, repeated 4x
        hll.add(user_id)
        true_unique.add(user_id)

    print("HyperLogLog estimate:", hll.count())
    print("Actual unique count :", len(true_unique))
```

### JavaScript

```javascript
class HyperLogLog {
  constructor(b = 10) {
    this.b = b;                     // bits used to pick a register
    this.m = 1 << b;                // number of registers (e.g. 1024)
    this.registers = new Uint8Array(this.m);
    this.alpha = 0.7213 / (1 + 1.079 / this.m);
  }

  static hash(str) {
    // 32-bit FNV-1a — fast and well distributed, good enough for this demo.
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  add(item) {
    const x = HyperLogLog.hash(String(item));
    const bucket = x & (this.m - 1);           // low bits choose the register
    const remaining = x >>> this.b;            // remaining bits decide the rank
    const leadingZeros = Math.clz32(remaining) - this.b;
    const rank = leadingZeros + 1;
    if (rank > this.registers[bucket]) this.registers[bucket] = rank;
  }

  count() {
    let sum = 0;
    let zeroRegisters = 0;
    for (const r of this.registers) {
      sum += Math.pow(2, -r);
      if (r === 0) zeroRegisters++;
    }

    const rawEstimate = (this.alpha * this.m * this.m) / sum;

    if (rawEstimate <= 2.5 * this.m && zeroRegisters > 0) {
      return Math.round(this.m * Math.log(this.m / zeroRegisters));
    }
    return Math.round(rawEstimate);
  }
}

// Demo: count unique users in a stream of 1,000,000 events using ~1 KB of memory.
const hll = new HyperLogLog(10); // 1024 registers
const trueUnique = new Set();

for (let i = 0; i < 1_000_000; i++) {
  const userId = `user-${i % 250000}`; // 250,000 unique IDs, repeated 4x
  hll.add(userId);
  trueUnique.add(userId);
}

console.log("HyperLogLog estimate:", hll.count());
console.log("Actual unique count :", trueUnique.size);
```

Sample output (Python):

```
HyperLogLog estimate: 249273
Actual unique count : 250000
```

## Complexity

- **Time:** `O(1)` per insertion (one hash, one comparison), `O(m)` to compute the final estimate, where `m` is the number of registers.
- **Space:** `O(m)` — completely independent of `n`, the number of items seen. With `m = 1024` registers of one byte each, you're looking at ~1 KB whether the stream has a thousand items or a trillion.

A hash set solving the same problem exactly would cost `O(n)` space — HyperLogLog trades a small, provable error rate (~`1.04/√m`, about 3% for `m = 1024`) for turning that into a constant.

## One Minute Insight

You don't need to remember everything to know roughly how much you've seen — sometimes the rarest thing you noticed *is* the measurement.
