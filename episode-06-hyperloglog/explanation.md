# Counting to a Billion With 16 Bytes

How does a website tell you "2.1 billion unique visitors" without storing 2.1 billion IDs? A 50-year-old coin-flip trick called **HyperLogLog** does it with a handful of bytes and a shrug of acceptable error.

---

## The Problem

You're building analytics for a site with **1 billion daily events**, and you need to answer one question: *how many distinct users showed up?*

The obvious approach — a `Set` of every user ID — works, but it costs real memory: a billion IDs might mean gigabytes of RAM just to answer "how many are unique?"

**Can you estimate the count of distinct items in a massive stream using almost no memory, and accept a tiny bit of error in exchange?**

This isn't a hypothetical. It's exactly how Redis's `PFCOUNT`, Google BigQuery's `APPROX_COUNT_DISTINCT`, and most large-scale analytics pipelines count unique visitors, unique search queries, and unique IPs — in real time, with **kilobytes**, not gigabytes.

---

## Example

```
Stream: ["alice", "bob", "alice", "carol", "dave", "bob", "eve", ...]

Exact answer (a Set):     5 distinct users, 5 units of memory
HyperLogLog estimate:     ~5 (±a few %), a FIXED number of registers

Scale it up:
  10,000,000 distinct users → Set needs ~10M slots
                            → HyperLogLog still needs the SAME small
                              number of registers (e.g. 16 bytes),
                              with ~2% error
```

The memory footprint doesn't grow with the data. That's the whole trick.

---

## Why It Matters

This is the core idea behind **probabilistic data structures** — trading perfect accuracy for massive space savings, on purpose:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | `APPROX_COUNT_DISTINCT` in BigQuery, Redshift, Presto |
| **Caching / Redis** | `PFADD` / `PFCOUNT` — unique visitor counters at scale |
| **Networking** | Estimating distinct flows through a router without full packet logs |
| **Distributed systems** | Merging cardinality estimates from many nodes cheaply (registers just take a `max`) |
| **A/B testing & analytics** | Real-time unique-user dashboards that can't afford a giant hash set |

The deeper lesson: when a system asks "how many *different* things happened?", you often don't need the exact answer — you need a fast, small, good-enough one. Trading a little accuracy for O(1) memory is a legitimate engineering move, not a shortcut.

---

## Solution

### The Key Insight: Rare Events Reveal Scale

Flip a fair coin until you get heads. Getting heads on flip 1 is common. Getting heads for the *first* time on flip 20 is rare — it suggests you did a **lot** of flipping.

HyperLogLog turns hashing into "coin flips":

1. Hash each item into a random-looking bit string.
2. Use the **first few bits** to pick one of `m` buckets (like sorting into `m` baskets).
3. In the **remaining bits**, count how many leading zeros appear before the first `1`. A long run of zeros is a "rare" hash — a strong hint that many distinct items have passed through that bucket.
4. Each bucket keeps only the **longest run of zeros it has ever seen** — a single small number.
5. Combine all bucket values with a harmonic mean to smooth out noise, and multiply by a bias-correction constant.

### Step-by-Step Walkthrough

```
m = 16 buckets, each storing one small integer (starts at 0)

For each item:
  hash(item)          → 32-bit-ish binary string
  first 4 bits         → which bucket (0-15)
  rest of the bits      → count leading zeros, +1 → "rank"
  bucket[i] = max(bucket[i], rank)

After seeing everything:
  estimate = alpha_m * m^2 / sum(2^-bucket[i] for all buckets)

Intuition:
  - Few distinct items  → buckets rarely see long zero-runs → small estimate
  - Many distinct items → some bucket eventually sees a long zero-run
                          (rare, but with enough tries, it happens)
                        → estimate scales up accordingly
```

No item is ever stored. Only `m` small counters exist, no matter if you see 10 items or 10 billion.

---

## Code

### Python

```python
import hashlib
import math

class HyperLogLog:
    def __init__(self, b=4):
        self.b = b                      # bucket-index bits
        self.m = 1 << b                 # number of buckets (16 here)
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash_bits(self, item):
        # 32-bit hash, rendered as a fixed-width binary string
        digest = hashlib.md5(str(item).encode()).digest()
        h = int.from_bytes(digest[:4], "big")
        return format(h, "032b")

    def add(self, item):
        bits = self._hash_bits(item)
        bucket = int(bits[:self.b], 2)          # first b bits -> bucket index
        rest = bits[self.b:]
        rank = len(rest) - len(rest.lstrip("0")) + 1  # leading zeros + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        estimate = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=4)
    users = [f"user_{i % 5000}" for i in range(50_000)]  # 5,000 unique users

    for u in users:
        hll.add(u)

    print("True distinct count:", len(set(users)))
    print("HyperLogLog estimate:", hll.count())
```

### JavaScript

```javascript
const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 4) {
    this.b = b;
    this.m = 1 << b; // number of buckets
    this.registers = new Array(this.m).fill(0);
    this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
  }

  _hashBits(item) {
    const digest = crypto.createHash("md5").update(String(item)).digest();
    const h = digest.readUInt32BE(0);
    return h.toString(2).padStart(32, "0");
  }

  add(item) {
    const bits = this._hashBits(item);
    const bucket = parseInt(bits.slice(0, this.b), 2);
    const rest = bits.slice(this.b);
    const rank = rest.indexOf("1") === -1 ? rest.length + 1 : rest.indexOf("1") + 1;
    this.registers[bucket] = Math.max(this.registers[bucket], rank);
  }

  count() {
    const sum = this.registers.reduce((acc, r) => acc + Math.pow(2, -r), 0);
    const estimate = (this.alpha * this.m * this.m) / sum;
    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(4);
const users = Array.from({ length: 50000 }, (_, i) => `user_${i % 5000}`); // 5,000 unique

users.forEach((u) => hll.add(u));

console.log("True distinct count:", new Set(users).size);
console.log("HyperLogLog estimate:", hll.count());
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per insert | One hash + one bucket update, regardless of stream size |
| **Space** | O(m) — constant | `m` small counters (e.g. 16), never grows with the number of items seen |

Compare that to a `Set`: O(n) time to build and **O(n) space** — memory that grows forever as unique items pour in. HyperLogLog trades a small, well-understood error (~1-2% with a few thousand registers) for memory that never grows.

---

## One Minute Insight

> **You don't need to remember everything to know how much you've seen.** HyperLogLog never stores a single item — it only remembers the *rarest pattern* it has observed, and rarity itself is a proxy for scale.

This is the same instinct behind Bloom filters and reservoir sampling: sometimes the smartest data structure isn't the one that stores more, it's the one that figures out what *not* to store. When "exactly right" costs gigabytes and "close enough" costs kilobytes, close enough usually wins.

*Run `code.py` or `code.js` to see it in action.*
