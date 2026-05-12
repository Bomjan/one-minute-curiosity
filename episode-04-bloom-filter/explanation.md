# The Probabilistic Gatekeeper

A data structure that can say **"definitely not"** but only **"probably yes"** — and that tradeoff turns out to be one of the most useful ideas in systems engineering.

---

## The Problem

You're building a web crawler. Before fetching a URL, you want to know: *have we visited this page before?*

You have **10 billion URLs** in your history. A hash set would eat ~400 GB of RAM. A database lookup adds latency to every single fetch.

What if you could answer "have we seen this?" in **O(1) time** using **~1.2 GB of RAM** — with zero false negatives and a tiny, tuneable false-positive rate?

That's a **Bloom filter**.

---

## Example

```
Bloom filter with 20 bits, 3 hash functions.

Add "google.com":
  hash1("google.com") = 4  → set bit 4
  hash2("google.com") = 9  → set bit 9
  hash3("google.com") = 17 → set bit 17
  bits: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0]

Check "google.com" → bits 4, 9, 17 all set → PROBABLY in set ✓
Check "bing.com"   → hash1 = 4 (set), hash2 = 3 (not set) → DEFINITELY NOT in set ✓
Check "yahoo.com"  → bits 4, 9, 17 all happen to be set → FALSE POSITIVE (rare)
```

The filter never misses something it stored. It occasionally says "yes" for something it didn't — but you control how often.

---

## Why It Matters

Bloom filters are everywhere in production systems:

| System | Use |
| :--- | :--- |
| **Google Chrome** | Safe Browsing — fast check if a URL is malicious before a network call |
| **Cassandra / HBase** | Skip disk reads for keys that don't exist in an SSTable |
| **PostgreSQL** | Speed up `EXISTS` checks and join filters |
| **Akamai CDN** | Avoid caching "one-hit-wonder" objects that won't be requested again |
| **Bitcoin SPV wallets** | Filter relevant transactions without downloading the full blockchain |
| **Medium / Reddit** | "Have you seen this post?" without storing your full history |

The pattern is always the same: use a Bloom filter as a **cheap pre-filter** in front of an expensive operation (disk I/O, network call, full DB query).

---

## Solution

### The Data Structure

A Bloom filter is just:
- A **bit array** of size `m` (all zeros initially)
- **k independent hash functions**, each mapping an item to one of the `m` positions

### Adding an Item

Hash the item with all `k` functions. Set those `k` bit positions to `1`.

### Checking Membership

Hash the item with all `k` functions. If **all** those positions are `1` → probably present. If **any** is `0` → definitely absent.

### Why No False Negatives?

Because you set bits, you never clear them. Once a bit is `1`, it stays `1`. So if an item was added, its bits are guaranteed to be set.

### Tuning the False-Positive Rate

The false-positive probability `p` for `n` inserted items in a filter of `m` bits with `k` hash functions:

```
p ≈ (1 - e^(-kn/m))^k
```

Optimal number of hash functions: `k = (m/n) * ln(2)`

For **1% false positive rate** on 1 billion items: ~1.14 GB. For **0.1%**: ~1.7 GB. You trade memory for accuracy — linearly and predictably.

### Walkthrough

```
Goal: ~1% false-positive rate, expecting 1,000 items

m = 9,585 bits (~1.2 KB)
k = 7 hash functions

Add "alice@example.com":
  Compute 7 positions → set those 7 bits

Add "bob@example.com":
  Compute 7 positions → set those 7 bits (some may overlap with alice's)

Check "charlie@example.com":
  Compute 7 positions → if any bit is 0 → NOT in set (guaranteed)
  If all 7 bits happen to be set by alice+bob's insertions → false positive (≤1%)
```

---

## Code

### Python

```python
import math
import hashlib


class BloomFilter:
    def __init__(self, capacity, false_positive_rate=0.01):
        self.n = capacity
        self.p = false_positive_rate
        # Optimal bit array size and number of hash functions
        self.m = math.ceil(-self.n * math.log(self.p) / (math.log(2) ** 2))
        self.k = math.ceil((self.m / self.n) * math.log(2))
        self.bits = bytearray(math.ceil(self.m / 8))

    def _hash_positions(self, item):
        positions = []
        item_bytes = item.encode() if isinstance(item, str) else item
        for i in range(self.k):
            digest = hashlib.sha256(item_bytes + i.to_bytes(2, "big")).hexdigest()
            positions.append(int(digest, 16) % self.m)
        return positions

    def _set_bit(self, pos):
        self.bits[pos // 8] |= 1 << (pos % 8)

    def _get_bit(self, pos):
        return bool(self.bits[pos // 8] & (1 << (pos % 8)))

    def add(self, item):
        for pos in self._hash_positions(item):
            self._set_bit(pos)

    def __contains__(self, item):
        return all(self._get_bit(pos) for pos in self._hash_positions(item))


if __name__ == "__main__":
    bf = BloomFilter(capacity=1000, false_positive_rate=0.01)

    for url in ["google.com", "github.com", "python.org"]:
        bf.add(url)

    print("google.com" in bf)    # True  (probably)
    print("github.com" in bf)    # True  (probably)
    print("bing.com" in bf)      # False (definitely not — unless false positive)
    print(f"Bit array size: {bf.m} bits ({bf.m // 8} bytes)")
    print(f"Hash functions: {bf.k}")
```

### JavaScript

```javascript
const crypto = require("crypto");

class BloomFilter {
    constructor(capacity, falsePositiveRate = 0.01) {
        this.n = capacity;
        this.p = falsePositiveRate;
        // Optimal bit array size and number of hash functions
        this.m = Math.ceil((-this.n * Math.log(this.p)) / Math.log(2) ** 2);
        this.k = Math.ceil((this.m / this.n) * Math.log(2));
        this.bits = Buffer.alloc(Math.ceil(this.m / 8));
    }

    _hashPositions(item) {
        const positions = [];
        for (let i = 0; i < this.k; i++) {
            const seed = Buffer.alloc(2);
            seed.writeUInt16BE(i);
            const hash = crypto
                .createHash("sha256")
                .update(item + seed.toString("hex"))
                .digest("hex");
            positions.push(BigInt("0x" + hash) % BigInt(this.m));
        }
        return positions;
    }

    _setBit(pos) {
        const p = Number(pos);
        this.bits[Math.floor(p / 8)] |= 1 << (p % 8);
    }

    _getBit(pos) {
        const p = Number(pos);
        return !!(this.bits[Math.floor(p / 8)] & (1 << (p % 8)));
    }

    add(item) {
        for (const pos of this._hashPositions(item)) {
            this._setBit(pos);
        }
    }

    has(item) {
        return this._hashPositions(item).every((pos) => this._getBit(pos));
    }
}

const bf = new BloomFilter(1000, 0.01);

["google.com", "github.com", "python.org"].forEach((url) => bf.add(url));

console.log(bf.has("google.com"));  // true  (probably)
console.log(bf.has("github.com"));  // true  (probably)
console.log(bf.has("bing.com"));    // false (definitely not)
console.log(`Bit array: ${bf.m} bits (${Math.ceil(bf.m / 8)} bytes)`);
console.log(`Hash functions: ${bf.k}`);
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Add / Check time** | O(k) — k hash computations, independent of set size |
| **Space** | O(m) bits — tunable; ~9.6 bits per item at 1% false-positive rate |
| **False negatives** | 0% — impossible by construction |
| **False positives** | Tuneable — trade space for accuracy |

Compare to a hash set: O(1) time but O(n) space — storing the actual values. A Bloom filter stores *evidence* of membership, not the values themselves. That's how it achieves 10-100x compression.

---

## One Minute Insight

> **Bloom filters trade certainty for memory.** The insight is that "definitely not" is often enough — you only need to do the expensive work (disk read, network call, full DB query) when the answer *might* be yes. In practice, that eliminates the vast majority of unnecessary work.

This is the engineering principle of **cheap pre-filtering**: spend a tiny amount of resources to rule out the impossible, then invest real resources only in the plausible.

*Run `code.py` or `code.js` to see it in action.*
