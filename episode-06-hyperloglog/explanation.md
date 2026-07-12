# How Redis Counts a Billion Visitors With 12KB

Ask a database to count *exact* unique visitors on a billion-row table and it'll grind. Ask it to count them *approximately* -- within 2% -- and it can answer in constant memory. That trade is the whole trick.

---

## The Problem

You're tracking unique visitors to a website. The obvious approach: keep a `Set` of every visitor ID you've seen.

That works great until you have 100 million visitors, and your "simple counter" is now a multi-gigabyte hash set that has to live somewhere, get merged across servers, and never shrink.

**The question:** can you estimate the number of *distinct* items in a massive stream, using memory that stays constant no matter how big the stream gets -- while accepting a small, predictable amount of error?

This is the **cardinality estimation** problem, and the elegant answer is an algorithm called **HyperLogLog**.

---

## Example

```
Stream: user_1, user_2, user_1, user_3, user_2, user_1, user_4, ...
        (100,000 events, but only ~100,000 unique users)

Exact answer:  a Set with 100,000 entries  → megabytes of memory
HyperLogLog:   1,024 tiny counters (registers) → a few kilobytes

HLL estimate:  104,594   (real: 100,000 → ~4.6% error)
```

The memory footprint doesn't change whether the stream has 1,000 events or 1,000,000,000 -- it's fixed by how many registers you choose to keep.

---

## Why It Matters

Exact uniqueness counting doesn't scale, so production systems lean on probabilistic structures constantly:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `Redis PFCOUNT`, PostgreSQL's `hll` extension for `COUNT(DISTINCT ...)` at scale |
| **Analytics** | Counting unique daily active users across billions of events |
| **Distributed systems** | Merging cardinality estimates from many servers with a simple max operation |
| **Networking** | Estimating distinct flows/IPs seen by a router without storing every address |
| **Cybersecurity** | Spotting DDoS traffic by tracking distinct source IPs in near-real time |

The deeper lesson: when "approximately right, instantly" beats "exactly right, eventually," you reach for a probabilistic data structure instead of an exact one -- the same family as Bloom filters, but for counting instead of membership.

---

## Solution

### The Key Insight: Rare Patterns Signal Large Counts

Flip a fair coin repeatedly. Getting 5 heads in a row is rare -- but the *more coins you flip*, the more likely you are to see a rare streak somewhere.

HyperLogLog turns every item into a "coin-flip sequence" by hashing it. It watches for the **longest run of leading zero bits** it has ever seen in a hash. A long run of zeros is rare, so seeing one is evidence that *many* distinct items have been hashed -- because it took a lot of tries to get unlucky enough to produce it.

### Step-by-Step Walkthrough

1. **Hash** each incoming item to a fixed-size number.
2. **Split** the hash into two parts:
   - A few bits pick which of `m` registers this item "votes" on (this is what lets you split work across many small buckets instead of one global counter).
   - The rest of the bits are scanned for their leading-zero run length (the "rank").
3. **Store** only the *maximum* rank ever seen in each register -- one small integer per register, regardless of how many items hash into it.
4. **Estimate** the total distinct count by combining all `m` registers with the harmonic mean formula (this smooths out registers that got an unlucky/lucky rank).

Because each register only remembers the single biggest rank it's seen, adding a duplicate item never changes anything -- which is exactly the "count uniques" property you want, for free.

### Why the Harmonic Mean?

A simple average gets wrecked by one register that randomly saw a huge rank. The harmonic mean formula (`alpha * m² / Σ 2⁻ʳᵃⁿᵏ`) suppresses the influence of outliers, which is why HyperLogLog's error stays predictable (`~1.04/√m`) instead of blowing up.

---

## Code

### Python

```python
import math
import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b  # number of registers (buckets)
        self.registers = [0] * self.m

        if self.m == 16:
            self.alpha = 0.673
        elif self.m == 32:
            self.alpha = 0.697
        elif self.m == 64:
            self.alpha = 0.709
        else:
            self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")

    def _rank(self, w, width):
        if w == 0:
            return width + 1
        return width - w.bit_length() + 1

    def add(self, item):
        x = self._hash(item)
        bucket = x >> (64 - self.b)
        w = x & ((1 << (64 - self.b)) - 1)
        rank = self._rank(w, 64 - self.b)
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        z = sum(2.0 ** -r for r in self.registers)
        estimate = self.alpha * self.m * self.m / z

        zeros = self.registers.count(0)
        if estimate <= 2.5 * self.m and zeros > 0:
            estimate = self.m * math.log(self.m / zeros)

        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 registers, ~3% typical error

    unique_visitors = [f"user_{i}" for i in range(100_000)]
    for visitor in unique_visitors:
        hll.add(visitor)

    print("Real count:  ", len(unique_visitors))
    print("HLL estimate:", hll.count())
```

### JavaScript

```javascript
const crypto = require('crypto');

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b;
    this.registers = new Array(this.m).fill(0);

    if (this.m === 16) this.alpha = 0.673;
    else if (this.m === 32) this.alpha = 0.697;
    else if (this.m === 64) this.alpha = 0.709;
    else this.alpha = 0.7213 / (1 + 1.079 / this.m);
  }

  _hash(item) {
    const digest = crypto.createHash('sha1').update(String(item)).digest();
    return digest.readBigUInt64BE(0);
  }

  _rank(w, width) {
    if (w === 0n) return width + 1;
    return width - w.toString(2).length + 1;
  }

  add(item) {
    const x = this._hash(item);
    const bucket = Number(x >> BigInt(64 - this.b));
    const mask = (1n << BigInt(64 - this.b)) - 1n;
    const w = x & mask;
    const rank = this._rank(w, 64 - this.b);
    this.registers[bucket] = Math.max(this.registers[bucket], rank);
  }

  count() {
    let z = 0;
    for (const r of this.registers) z += Math.pow(2, -r);
    let estimate = (this.alpha * this.m * this.m) / z;

    const zeros = this.registers.filter((r) => r === 0).length;
    if (estimate <= 2.5 * this.m && zeros > 0) {
      estimate = this.m * Math.log(this.m / zeros);
    }

    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(10);

const uniqueVisitors = Array.from({ length: 100000 }, (_, i) => `user_${i}`);
for (const visitor of uniqueVisitors) hll.add(visitor);

console.log('Real count:  ', uniqueVisitors.length);
console.log('HLL estimate:', hll.count());
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `add()` | One hash, one bucket lookup, one comparison -- independent of stream size |
| **Space** | O(m) | A fixed array of `m` small integers (e.g., 1,024 registers ≈ a few KB), regardless of whether you've seen 100 or 100 billion items |

Compare that to an exact `Set`: O(n) space, where `n` is the number of *distinct* items -- it grows forever. HyperLogLog trades a small, bounded error (`~1.04/√m`) for memory that never grows.

---

## One Minute Insight

> **You don't need to remember everything to know how much you've seen.** HyperLogLog throws away every item's identity and keeps only the single most surprising pattern per bucket -- yet that's enough to reconstruct the count within a couple percent.

It's the same philosophy as a Bloom filter: give up perfect recall, keep a tiny sketch, and let probability do the accounting. When "exactly right" doesn't scale, "provably close enough" often does.

*Run `code.py` or `code.js` to see it in action.*
