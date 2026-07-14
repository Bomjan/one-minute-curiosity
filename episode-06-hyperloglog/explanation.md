# How Do You Count a Billion Things With 1 Kilobyte?

If someone asked you "how many unique visitors did our site get today?", your instinct is to keep a `Set` of every visitor ID and check its size. That works — until the set itself is bigger than the memory of the machine counting it.

---

## The Problem

You need to count the number of **distinct** items in a massive stream — unique visitors, unique search queries, unique IP addresses hitting your API. The stream might contain billions of events.

The exact way to do this is to store every unique item you've seen (a hash set) and report its size. That costs memory **proportional to the number of unique items** — for a billion 64-byte IDs, that's tens of gigabytes, just to answer one question: "how many?"

**Can you estimate that count, within a couple of percent, using a *fixed*, tiny amount of memory — regardless of whether there are a thousand items or a trillion?**

This is exactly the problem **HyperLogLog** (HLL) solves, and it's the algorithm quietly running inside Redis, Google BigQuery, Presto, and Elasticsearch every time you call something like `APPROX_COUNT_DISTINCT`.

---

## Example

```
Feed the same 100,000 events into two counters:
  - only 40,000 of them are actually unique

A HashSet reports:        40,000   (exact, but stores all 40,000 items)
A HyperLogLog reports:  ~41,000   (off by ~4%, using only 1,024 registers)
```

That's a **1-byte register per bucket**, 1024 buckets total — about 1 KB — no matter if the true count were 40,000 or 40 billion.

---

## Why It Matters

Approximate counting is a foundational trick in large-scale systems:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `APPROX_COUNT_DISTINCT` in BigQuery, Presto, and PostgreSQL extensions |
| **Caching / in-memory stores** | Redis's `PFADD` / `PFCOUNT` commands are HyperLogLog directly |
| **Web analytics** | Counting unique visitors/sessions without storing every visitor ID |
| **Distributed systems** | Merging counts across shards by simply combining registers (no coordination needed) |
| **Networking** | Estimating the number of distinct flows or source IPs during traffic analysis |

The deeper lesson: **when a question only needs an approximate answer, trading a little accuracy for a lot less memory is usually the right trade.**

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a coin repeatedly and count how many flips it takes to see the first "heads." If you've *only ever* seen one flip before heads, that's unremarkable. But if you flipped **20 times** before seeing heads, that's rare — and rare events like that only tend to happen when you've run a *lot* of trials.

HyperLogLog turns every item into a coin-flip sequence using a hash function:

1. **Hash each item** into a (pseudo-)random number.
2. Use the hash's **first few bits** to pick one of `m` buckets — this is how the algorithm spreads work across registers, just like sharding.
3. Look at the **remaining bits** and count how many leading zeros appear before the first `1`. Call this the "rank."
4. Each bucket keeps only the **maximum rank** it has ever seen.

A single bucket seeing rank 20 suggests roughly `2^20` items have passed through *that* bucket. Average that signal across all `m` buckets (using a harmonic mean, which resists outliers), multiply by `m`, and apply a known bias-correction constant — and you get a surprisingly accurate estimate of the total distinct count.

### Step-by-Step Walkthrough

```
item "user-42" → hash → 0110 1010 0001 ...
                          └┬─┘ └───┬────┘
                        bucket   remaining bits
                       (picks    (count leading
                        register  zeros here)
                        index)

bucket 6's remaining bits start with "1010..." → 0 leading zeros → rank 1
bucket registers[6] = max(registers[6], 1)

Do this for every item. Rare long runs of zeros bump a register up.
More unique items → more chances for a rare long run → higher registers
→ higher estimated count.
```

At the end: `estimate = alpha_m * m² / Σ(2^-registers[i])` — a harmonic mean that smooths out noise, scaled by `m` and a precomputed constant `alpha_m`.

---

## Code

### Python

```python
"""HyperLogLog: count billions of unique items using kilobytes of memory."""

import hashlib
import math


class HyperLogLog:
    """Estimates the number of distinct items using O(m) memory,
    no matter how many items are added."""

    def __init__(self, precision=10):
        self.p = precision            # bits used to pick a register
        self.m = 1 << precision       # number of registers
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    @staticmethod
    def _alpha(m):
        # standard HyperLogLog bias-correction constant
        if m == 16:
            return 0.673
        if m == 32:
            return 0.697
        if m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")  # 64-bit hash

    def _leading_zero_count(self, value, bits):
        if value == 0:
            return bits
        count = 0
        mask = 1 << (bits - 1)
        while mask and not (value & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        h = self._hash(item)
        bucket = h & (self.m - 1)                    # low p bits select the register
        remaining = h >> self.p                       # remaining (64 - p) bits
        rank = self._leading_zero_count(remaining, 64 - self.p) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.registers)

        # small-range correction: fall back to linear counting when
        # many registers are still untouched
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))

        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)
    true_items = set()

    for i in range(100_000):
        value = f"user-{i % 40_000}"  # only 40,000 truly unique values
        hll.add(value)
        true_items.add(value)

    print(f"Actual unique items:   {len(true_items)}")
    print(f"HyperLogLog estimate:  {hll.count()}")
    print(f"Memory used:           {hll.m} registers (~{hll.m} bytes)")
```

### JavaScript

```javascript
// HyperLogLog: count billions of unique items using kilobytes of memory.

function hash32(str) {
    // FNV-1a mixed with a Murmur3-style finalizer for a good bit spread
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;                 // bits used to pick a register
        this.m = 1 << precision;            // number of registers
        this.registers = new Uint8Array(this.m);
        this.alpha = HyperLogLog._alpha(this.m);
    }

    static _alpha(m) {
        // standard HyperLogLog bias-correction constant
        if (m === 16) return 0.673;
        if (m === 32) return 0.697;
        if (m === 64) return 0.709;
        return 0.7213 / (1 + 1.079 / m);
    }

    _leadingZeroCount(value, bits) {
        if (value === 0) return bits;
        let count = 0;
        for (let mask = 1 << (bits - 1); mask !== 0 && !(value & mask); mask >>>= 1) {
            count++;
        }
        return count;
    }

    add(item) {
        const h = hash32(String(item));
        const bucket = h & (this.m - 1);            // low p bits select the register
        const remaining = h >>> this.p;              // remaining (32 - p) bits
        const rank = this._leadingZeroCount(remaining, 32 - this.p) + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        let sum = 0;
        let zeros = 0;
        for (const r of this.registers) {
            sum += Math.pow(2, -r);
            if (r === 0) zeros++;
        }
        const raw = (this.alpha * this.m * this.m) / sum;

        // small-range correction: fall back to linear counting when
        // many registers are still untouched
        if (raw <= 2.5 * this.m && zeros > 0) {
            return Math.round(this.m * Math.log(this.m / zeros));
        }

        return Math.round(raw);
    }
}

const hll = new HyperLogLog(10);
const trueItems = new Set();

for (let i = 0; i < 100000; i++) {
    const value = `user-${i % 40000}`; // only 40,000 truly unique values
    hll.add(value);
    trueItems.add(value);
}

console.log(`Actual unique items:   ${trueItems.size}`);
console.log(`HyperLogLog estimate:  ${hll.count()}`);
console.log(`Memory used:           ${hll.m} registers (~${hll.m} bytes)`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `add`, O(m) for `count` | Each insert only hashes and updates one register; the final estimate scans all `m` registers once |
| **Space** | O(m) — a small constant | With `precision = 10`, that's `2^10 = 1024` single-byte registers (~1 KB), independent of how many items were added |

Compare that to a `HashSet`, which needs **O(n)** space for `n` unique items — HyperLogLog trades exactness for a memory footprint that never grows.

---

## One Minute Insight

> **You don't need to remember everything to know how much there was.** HyperLogLog never stores a single item — it only remembers the *rarest pattern* it has witnessed. Rarity is a proxy for scale, and that's enough to reconstruct a count within a couple of percent.

This is the same trade every approximate algorithm makes: give up perfect precision to gain constant memory. When "exactly 40,000" and "about 41,000" lead to the same business decision, that trade is nearly always worth it.

*Run `code.py` or `code.js` to see it in action.*
