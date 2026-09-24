# Counting a Billion Things With a Teaspoon of Memory

How many *unique* visitors hit your website today? A bouncer at a club with a million-person guest list doesn't need a clipboard with every name on it — they just need to know roughly how crowded it is. Turns out, computers can do the same trick, and the math behind it is delightfully sneaky.

---

## The Problem

You're watching a stream of billions of events — page views, IP addresses, search queries — and you need to answer one question: **how many *distinct* items have you seen?**

The obvious approach: keep every seen item in a `Set`. Correct, but it costs O(n) memory — track a billion unique user IDs and you need gigabytes of RAM just for bookkeeping.

**Can you estimate the count of distinct items using a *fixed*, tiny amount of memory — even if the stream is infinite?**

Exact isn't required. Close enough, cheap enough, is the whole point.

---

## Example

```
Stream: user-1, user-2, user-1, user-3, user-2, user-1, user-4, user-2, ...
        (50,000 events, but only 20,000 distinct users)

Exact answer (using a Set):     20,000   →  needs ~20,000 stored strings
HyperLogLog estimate:           20,536   →  needs exactly 1,024 tiny counters

Error: ~2.7%          Memory: a few KB, no matter how long the stream runs
```

Feed it a stream with a billion distinct items instead of 20,000, and the memory footprint **doesn't change**. That's the entire point.

---

## Why It Matters

This is the algorithm quietly running behind the scenes at massive scale:

| System | What it's counting |
| :--- | :--- |
| **Redis `PFCOUNT`** | Unique visitors, unique search terms |
| **Google BigQuery `APPROX_COUNT_DISTINCT`** | Distinct values across billions of rows |
| **Network security** | Unique source IPs hitting a server (DDoS / port-scan detection) |
| **Analytics pipelines** | Daily active users, without a distributed `GROUP BY` |
| **Databases** | Query planners estimating cardinality to pick a join strategy |

The deeper idea — **trade a little accuracy for a lot less memory** — is a recurring theme in systems that operate at scale. You already met one cousin of this family: the Bloom filter (Episode 04), which answers "have I seen this?" in constant space. HyperLogLog answers a harder question — "how many *different* things have I seen?" — using the same spirit of probabilistic bookkeeping.

---

## Solution

### The Key Insight: Rare Patterns Reveal Scale

Flip a fair coin repeatedly and count how many flips until you get heads. Getting heads on flip 1 is common. Getting heads for the first time on flip 20 is rare — and the fact that it happened *at all* tells you something: you probably flipped the coin **many** times to get that lucky.

HyperLogLog applies this to hashes instead of coins:

1. **Hash every item** into a random-looking bit string.
2. **Count leading zero bits** in that hash (this is the "flip streak"). A long run of zeros is rare — seeing one is a hint that you've hashed *a lot* of distinct items.
3. **Track only the longest streak seen.** The longer the max streak, the more distinct items you've likely processed.

One counter is noisy, though — a single lucky hash can throw it off. So HyperLogLog splits the incoming hashes across **many small buckets** (using a few bits of the hash to pick the bucket), tracks the best streak *per bucket*, and combines all the buckets with a harmonic mean — which is naturally resistant to outliers.

### Step-by-Step Walkthrough

```
1. Pick m buckets (say, 1024). Each bucket holds one small number (a "register").

2. For each incoming item:
   a. hash(item) -> a 32-bit pseudo-random number
   b. Use the first 10 bits to choose a bucket (1 of 1024)
   c. Use the remaining 22 bits to count leading zeros + 1 -> "rank"
   d. Store rank in that bucket only if it beats what's already there

3. To estimate the count:
   - Take the harmonic mean of all 2^register values across buckets
   - Multiply by a correction constant (alpha_m) and m^2
   - If cardinality is small, fall back to simpler "linear counting" for accuracy

Result: one number, built from 1024 tiny registers, approximating
        how many distinct items streamed through — ever.
```

No list of items is ever stored. Once a bucket's register is updated, the original item is forgotten forever.

---

## Code

### Python

```python
import hashlib
import math


def _hash32(item):
    digest = hashlib.sha1(str(item).encode()).digest()
    return int.from_bytes(digest[:4], "big")


def _rho(w, max_bits):
    if w == 0:
        return max_bits + 1
    rank = 1
    mask = 1 << (max_bits - 1)
    while not (w & mask):
        rank += 1
        mask >>= 1
    return rank


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m
        self.remaining_bits = 32 - b

    def add(self, item):
        h = _hash32(item)
        index = h >> self.remaining_bits
        w = h & ((1 << self.remaining_bits) - 1)
        rank = _rho(w, self.remaining_bits)
        self.registers[index] = max(self.registers[index], rank)

    def _alpha(self):
        if self.m == 16:
            return 0.673
        if self.m == 32:
            return 0.697
        if self.m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / self.m)

    def count(self):
        alpha = self._alpha()
        raw = alpha * self.m * self.m / sum(2.0 ** -r for r in self.registers)
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))
        return round(raw)


hll = HyperLogLog(b=10)
for i in range(50_000):
    hll.add(f"user-{i % 20_000}")

print(hll.count())  # ~20,536 (true answer: 20,000)
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash32(item) {
    const digest = crypto.createHash("sha1").update(String(item)).digest();
    return digest.readUInt32BE(0);
}

function rho(w, maxBits) {
    if (w === 0) return maxBits + 1;
    let rank = 1;
    let mask = 1 << (maxBits - 1);
    while ((w & mask) === 0) {
        rank++;
        mask >>>= 1;
    }
    return rank;
}

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;
        this.m = 1 << b;
        this.registers = new Array(this.m).fill(0);
        this.remainingBits = 32 - b;
    }

    add(item) {
        const h = hash32(item);
        const index = h >>> this.remainingBits;
        const w = h & ((1 << this.remainingBits) - 1);
        const rank = rho(w, this.remainingBits);
        this.registers[index] = Math.max(this.registers[index], rank);
    }

    _alpha() {
        if (this.m === 16) return 0.673;
        if (this.m === 32) return 0.697;
        if (this.m === 64) return 0.709;
        return 0.7213 / (1 + 1.079 / this.m);
    }

    count() {
        const alpha = this._alpha();
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (alpha * this.m * this.m) / sum;
        const zeros = this.registers.filter((r) => r === 0).length;
        if (raw <= 2.5 * this.m && zeros > 0) {
            return Math.round(this.m * Math.log(this.m / zeros));
        }
        return Math.round(raw);
    }
}

const hll = new HyperLogLog(10);
for (let i = 0; i < 50_000; i++) {
    hll.add(`user-${i % 20_000}`);
}

console.log(hll.count()); // ~20,536 (true answer: 20,000)
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insert | One hash + one bucket update, regardless of stream size |
| **Space** | O(m) — constant | `m` small registers (e.g. 1024), independent of how many items you've seen |

Compare that to the exact-count approach: O(n) space for a `Set` of every unique item. HyperLogLog trades that away entirely — 1024 single-byte registers (~1KB) can estimate cardinalities in the **billions** with roughly 1.04/√m relative error (~3% for m=1024).

---

## One Minute Insight

> **You don't need to remember everything to know roughly how much you've seen.** A single rare event — a long run of leading zeros — carries a statistical fingerprint of scale. Average that fingerprint across many independent buckets, and the noise cancels out while the signal survives.

This is the same trade-off that shows up again and again in large-scale systems: Bloom filters trade certainty for space when checking membership, reservoir sampling trades storage for a fair random sample, and HyperLogLog trades exactness for a cardinality estimate that fits in your L1 cache. When the input is unbounded but your memory isn't, **probability is the escape hatch**.

*Run `code.py` or `code.js` to see it in action.*
