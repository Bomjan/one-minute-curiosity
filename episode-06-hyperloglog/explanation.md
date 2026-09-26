# How Do You Count a Billion Unique Things in 12KB?

Google needs to count how many distinct search queries it's seen. Redis needs to count unique visitors to a page. Neither can afford to store every single item just to answer "how many *different* ones were there?" There's a data structure that answers this almost-exactly, using a few kilobytes no matter how big the stream gets.

---

## The Problem

You're watching a stream of items — IP addresses, user IDs, search terms — and you need to know the **count of distinct values**. Not the total count. The *unique* count.

The obvious approach: throw everything into a `Set` and check its size. That works, until the stream has a billion entries. Now your "simple" counter needs gigabytes of RAM just to remember what it's already seen.

**Can you estimate the number of unique items using a *fixed*, tiny amount of memory — regardless of whether the stream has a thousand or a trillion entries?**

You're allowed to be *approximately* right (within ~1-2%). You are not allowed to grow your memory with the data.

---

## Example

```
Stream: [user-1, user-2, user-1, user-3, user-2, user-4, user-1, ...]

Exact answer (a Set):        4 unique users → needs O(n) memory
HyperLogLog estimate:        ~4 unique users → needs O(1) memory

At scale:
  1,000,000 unique items  → Set: ~40 MB   | HyperLogLog: ~4 KB
  1,000,000,000 unique items → Set: ~40 GB | HyperLogLog: ~4 KB (same!)
```

The memory footprint of HyperLogLog **never changes**, no matter how many unique items pass through.

---

## Why It Matters

This isn't a party trick — it's running in production right now:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Redis's `PFCOUNT`/`PFADD` commands are literally HyperLogLog |
| **Analytics** | Counting unique visitors, unique search queries, unique errors per day |
| **Distributed systems** | Merging counts across thousands of servers without merging raw data |
| **Networking** | Estimating the number of distinct flows or source IPs during a DDoS |
| **Big data** | Google's original paper used it to count distinct queries at web scale |

The deeper idea: **you can trade a tiny, provable amount of accuracy for an enormous, provable amount of memory savings.** That trade is everywhere in systems that operate at scale — it's the same philosophy behind Bloom filters, sampling, and sketching algorithms in general.

---

## Solution

### The Key Insight: Rare Patterns Reveal Scale

Flip a fair coin repeatedly and count how many flips until you get heads. If you flipped a stream of coins and the *longest* run of tails-before-a-head you observed was 20, you can guess that you probably flipped the coin **around 2²⁰ times** — because a run that rare needs that many attempts to show up at all.

HyperLogLog applies this exact idea to hashes:

1. **Hash every item.** A good hash function turns items into effectively random bits.
2. **Look at the *leading zeros*** in that hash. A hash with `k` leading zero bits is a "rare event" that happens with probability `2^-k`. Seeing one means you've probably hashed around `2^k` distinct items.
3. **The single longest run problem:** using only one counter is too noisy — one lucky hash skews everything. So HyperLogLog splits the input into many small buckets (registers), tracks the max run of leading zeros *per bucket*, and then averages across all buckets using a harmonic mean (which is more resistant to outliers than a normal average).
4. **More buckets = more accuracy**, but each bucket only needs a few bits — hence the tiny footprint (1024 buckets × ~6 bits ≈ 768 bytes for ~2% error; Redis uses 16,384 buckets for ~0.8% error in about 12KB).

### Step-by-Step Walkthrough

```
For each item:
  1. hash(item) → a long pseudo-random number
  2. Use the first p bits to pick which register (bucket) to update
  3. Count leading zeros in the *remaining* bits, call it "rank"
  4. Store the MAX rank ever seen in that register (not the sum, not the last one)

To estimate the count:
  - Take the harmonic mean of 2^register across all registers
  - Multiply by (number of registers)^2 and a bias-correction constant
  - If the estimate is small relative to the register count, fall back to
    "linear counting" — a simpler correction that's more accurate for small inputs
```

Each item touches exactly **one register** with **O(1) work**. Merging two HyperLogLogs from different machines is just taking the element-wise max of their registers — no need to see the original data at all.

---

## Code

### Python

```python
import hashlib
import math


class HyperLogLog:
    """Estimates the number of DISTINCT items in a huge stream using tiny memory."""

    def __init__(self, precision=10):
        self.p = precision                 # number of bits used to pick a register
        self.m = 1 << precision            # number of registers (e.g. 1024)
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant

    def _hash(self, value):
        digest = hashlib.sha256(str(value).encode()).hexdigest()
        return int(digest, 16)

    def _leading_zeros(self, w, max_bits):
        if w == 0:
            return max_bits
        count = 0
        bit = max_bits - 1
        while bit >= 0 and not (w >> bit) & 1:
            count += 1
            bit -= 1
        return count

    def add(self, value):
        x = self._hash(value)
        bucket = x & (self.m - 1)          # first p bits -> which register
        w = x >> self.p                    # remaining bits -> measure rarity
        rank = self._leading_zeros(w, 256 - self.p) + 1  # position of first 1-bit
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        z = sum(2.0 ** -r for r in self.registers)
        estimate = self.alpha * (self.m ** 2) / z

        # Small-cardinality correction: raw HLL is biased when most
        # registers are still empty, so fall back to linear counting.
        zeros = self.registers.count(0)
        if estimate <= 2.5 * self.m and zeros > 0:
            estimate = self.m * math.log(self.m / zeros)

        return int(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers, ~4KB
    true_unique = 100_000

    for i in range(true_unique):
        hll.add(f"user-{i}")

    estimate = hll.count()
    error = abs(estimate - true_unique) / true_unique * 100

    print(f"True unique count:      {true_unique:,}")
    print(f"HyperLogLog estimate:   {estimate:,}")
    print(f"Error:                  {error:.2f}%")
    print(f"Memory used:            {hll.m} registers (~{hll.m} bytes)")
```

### JavaScript

```javascript
const crypto = require('crypto');

class HyperLogLog {
    // Estimates the number of DISTINCT items in a huge stream using tiny memory.
    constructor(precision = 10) {
        this.p = precision;                // number of bits used to pick a register
        this.m = 1 << precision;           // number of registers (e.g. 1024)
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m); // bias-correction constant
    }

    _hash(value) {
        const hex = crypto.createHash('sha256').update(String(value)).digest('hex');
        return BigInt('0x' + hex);
    }

    _leadingZeros(w, maxBits) {
        if (w === 0n) return maxBits;
        let count = 0;
        let bit = BigInt(maxBits - 1);
        while (bit >= 0n && ((w >> bit) & 1n) === 0n) {
            count++;
            bit--;
        }
        return count;
    }

    add(value) {
        const x = this._hash(value);
        const bucket = Number(x & BigInt(this.m - 1)); // first p bits -> which register
        const w = x >> BigInt(this.p);                 // remaining bits -> measure rarity
        const rank = this._leadingZeros(w, 256 - this.p) + 1; // position of first 1-bit
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        const z = this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);
        let estimate = (this.alpha * this.m * this.m) / z;

        // Small-cardinality correction: raw HLL is biased when most
        // registers are still empty, so fall back to linear counting.
        const zeros = this.registers.filter(r => r === 0).length;
        if (estimate <= 2.5 * this.m && zeros > 0) {
            estimate = this.m * Math.log(this.m / zeros);
        }

        return Math.round(estimate);
    }
}


const hll = new HyperLogLog(10); // 1024 registers, ~4KB
const trueUnique = 100_000;

for (let i = 0; i < trueUnique; i++) {
    hll.add(`user-${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - trueUnique) / trueUnique) * 100;

console.log(`True unique count:      ${trueUnique.toLocaleString()}`);
console.log(`HyperLogLog estimate:   ${estimate.toLocaleString()}`);
console.log(`Error:                  ${error.toFixed(2)}%`);
console.log(`Memory used:            ${hll.m} registers (~${hll.m} bytes)`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insert | One hash, one bucket lookup, one comparison — regardless of stream size |
| **Space** | O(m), constant | Memory is fixed by the number of registers, never by the number of items seen |

Compare that to an exact count, which needs **O(n) space** to remember every unique item. HyperLogLog trades a small, mathematically bounded error (~1-2% with typical settings) for memory that stays flat whether you're counting thousands or trillions of items.

---

## One Minute Insight

> **You don't need to remember everything to know how much of it there was.** A rare pattern — like an unusually long run of leading zeros — is itself evidence of scale. HyperLogLog turns that one observation, repeated across many independent buckets, into a surprisingly precise estimate.

This is the essence of *probabilistic data structures*: give up perfect precision deliberately, in exchange for a guarantee about how imprecise you'll ever be. Once you see that trade, you start noticing it everywhere — Bloom filters, Count-Min Sketch, reservoir sampling. They're not shortcuts. They're a different, often better, definition of "correct enough."

*Run `code.py` or `code.js` to see it in action.*
