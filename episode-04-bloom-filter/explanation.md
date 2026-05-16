# The Probabilistic Bouncer

What if you could check membership in a billion-item set in O(1) time, using a fraction of the memory — and the only trade-off was an occasional "maybe"?

---

## The Problem

You're building a web crawler. Before fetching a URL, you want to know: **have we visited this page before?**

You have **1 billion URLs** crawled so far. Each URL averages ~60 characters.

| Approach | Memory | Speed |
| :--- | :--- | :--- |
| Hash set in RAM | ~24 GB | O(1) |
| Database query | ~1 GB on disk | 10–100ms (too slow) |
| **Bloom filter** | **~1 GB** | **O(1)** |

A hash set is instant but bankrupts your RAM. A DB query is cheap but painfully slow at scale. The Bloom filter gives you both — with one caveat: it occasionally says "yes" when the answer is "no." It **never** misses something that was actually added.

> A Bloom filter is a data structure that is **always right when it says no**, but only **probably right when it says yes**.

---

## Example

```
bf = BloomFilter(size=1000, hash_count=3)

bf.add("google.com")
bf.add("github.com")

bf.contains("google.com")   → True   ✅ (definitely seen — all bits set)
bf.contains("reddit.com")   → False  ✅ (definitely NOT seen — a bit is 0)
bf.contains("linkedin.com") → True   ⚠️  (false positive — unlucky hash collision)
```

The false positive rate is tunable: more bits → fewer false positives.

---

## Why It Matters

Bloom filters are hiding in plain sight across modern infrastructure:

| System | Use Case |
| :--- | :--- |
| **Chrome** | Safe Browsing — fast local check before hitting Google's servers |
| **Cassandra / HBase** | Skip disk reads for keys that definitely don't exist |
| **Redis** | RedisBloom module for real-time deduplication |
| **Bitcoin SPV** | Light nodes filter which transactions to download |
| **Akamai CDN** | Avoid caching one-hit-wonder URLs |
| **npm** | Typosquatting and malicious package detection |

The pattern is always the same: a fast, cheap probabilistic gate that prevents expensive operations for definite misses.

---

## Solution

### The Core Idea

A Bloom filter is a **bit array of size `m`** (all zeros at start) and **`k` hash functions**.

**Adding an item:**
1. Hash the item with all `k` functions.
2. Each hash gives an index in `[0, m)`.
3. Set those `k` bits to `1`.

**Checking membership:**
1. Hash the item with all `k` functions.
2. Check those `k` bit positions.
3. If **any bit is 0** → the item is **definitely not** in the set.
4. If **all bits are 1** → the item is **probably** in the set.

### Why No False Negatives?

When you add `"google.com"`, you set specific bits. Those bits are never cleared. So if something was added, its bits are always set — a check will always return `True`.

### Why False Positives Happen?

Different items can share bit positions. After many insertions, some bit positions set by item A happen to also be the exact positions required by item B — even though B was never added.

### Visualized

```
Bit array (m=10):  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

Add "alice":
  h1("alice")=1, h2("alice")=5, h3("alice")=8
  → [0, 1, 0, 0, 0, 1, 0, 0, 1, 0]

Add "bob":
  h1("bob")=2, h2("bob")=5, h3("bob")=9
  → [0, 1, 1, 0, 0, 1, 0, 0, 1, 1]

Check "carol":
  h1("carol")=1, h2("carol")=2, h3("carol")=8
  → bits[1]=1, bits[2]=1, bits[8]=1 → all set!
  → False positive! Carol was never added.

Check "dave":
  h1("dave")=0, h2("dave")=3, h3("dave")=5
  → bits[0]=0 → STOP. Definitely not in set. ✅
```

### Optimal Parameters

The math gives us the ideal values to hit a target false positive rate `p`:

```
m = -n * ln(p) / (ln(2))²     # bit array size for n items
k = (m / n) * ln(2)            # optimal number of hash functions
```

For 1 million items at 1% false positive rate: only ~1.14 MB needed.

---

## Code

### Python

```python
import math
import mmh3  # pip install mmh3


class BloomFilter:
    def __init__(self, n_items: int, false_pos_rate: float = 0.01):
        self.size = self._optimal_size(n_items, false_pos_rate)
        self.hash_count = self._optimal_hashes(self.size, n_items)
        self.bit_array = bytearray(math.ceil(self.size / 8))

    def _optimal_size(self, n, p):
        return int(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hashes(self, m, n):
        return int((m / n) * math.log(2))

    def _bit_positions(self, item: str):
        return [mmh3.hash(item, seed) % self.size for seed in range(self.hash_count)]

    def _get_bit(self, pos):
        return (self.bit_array[pos // 8] >> (pos % 8)) & 1

    def _set_bit(self, pos):
        self.bit_array[pos // 8] |= 1 << (pos % 8)

    def add(self, item: str):
        for pos in self._bit_positions(item):
            self._set_bit(pos)

    def contains(self, item: str) -> bool:
        return all(self._get_bit(pos) for pos in self._bit_positions(item))


if __name__ == "__main__":
    bf = BloomFilter(n_items=1_000_000, false_pos_rate=0.01)

    for url in ["google.com", "github.com", "anthropic.com"]:
        bf.add(url)

    print(bf.contains("google.com"))     # True  ✅
    print(bf.contains("reddit.com"))     # False ✅ (almost certainly)
    print(bf.contains("github.com"))     # True  ✅

    size_kb = len(bf.bit_array) / 1024
    print(f"Filter size: {size_kb:.1f} KB for 1M items at 1% FPR")
```

### JavaScript

```javascript
class BloomFilter {
    constructor(nItems, falsePosRate = 0.01) {
        this.size = this._optimalSize(nItems, falsePosRate);
        this.hashCount = this._optimalHashes(this.size, nItems);
        this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    }

    _optimalSize(n, p) {
        return Math.ceil(-n * Math.log(p) / Math.log(2) ** 2);
    }

    _optimalHashes(m, n) {
        return Math.max(1, Math.round((m / n) * Math.log(2)));
    }

    // FNV-1a variant seeded with the hash number
    _hash(str, seed) {
        let h = 0x811c9dc5 ^ seed;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return Math.abs(h) % this.size;
    }

    _positions(item) {
        return Array.from({ length: this.hashCount }, (_, i) => this._hash(item, i));
    }

    add(item) {
        for (const pos of this._positions(item)) {
            this.bitArray[Math.floor(pos / 8)] |= 1 << (pos % 8);
        }
    }

    contains(item) {
        return this._positions(item).every(pos =>
            (this.bitArray[Math.floor(pos / 8)] >> (pos % 8)) & 1
        );
    }
}

const bf = new BloomFilter(1_000_000, 0.01);

["google.com", "github.com", "anthropic.com"].forEach(url => bf.add(url));

console.log(bf.contains("google.com"));    // true  ✅
console.log(bf.contains("reddit.com"));    // false ✅
console.log(bf.contains("github.com"));    // true  ✅

console.log(`Filter size: ${(bf.bitArray.length / 1024).toFixed(1)} KB for 1M items`);
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time (add)** | O(k) — constant, just `k` hash computations |
| **Time (contains)** | O(k) — same `k` hash computations |
| **Space** | O(m) — the bit array, fully independent of items stored |

`k` is typically 7–10, so both operations are effectively O(1). No matter if you've stored 1,000 items or 1 billion — it's the same speed.

For 1 million items at 1% false positive rate: ~1.14 MB.  
For 1 billion items at 0.1% false positive rate: ~1.8 GB.

You trade **exactness** for **memory and speed**. The false positive rate is fully under your control.

---

## One Minute Insight

> **Certainty is expensive. Asymmetric certainty is cheap.**

A Bloom filter exploits a fundamental asymmetry: proving absence is easy (one unset bit is enough), but proving presence is hard (every single bit must align). This asymmetry makes it perfect as a fast **pre-filter** before an expensive ground-truth check.

The broader lesson: in systems design, you rarely need *perfect* answers — you need *fast cheap answers* that eliminate the obviously wrong cases, reserving expensive resources only for genuine candidates. Bloom filters, probabilistic counting, and approximate nearest-neighbor search are all variations of this same idea.

*Run `code.py` or `code.js` to see it in action.*
