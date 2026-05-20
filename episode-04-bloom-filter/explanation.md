# The Lying Set That Never Misses

You want a data structure that can say **"definitely not in the set"** — but is allowed to occasionally be wrong when it says **"probably in the set"**. In exchange, it uses a fraction of the memory a hash set would.

That trade is a **Bloom Filter** — and it powers Chrome, Cassandra, Bitcoin wallets, and Redis.

---

## The Problem

You're building a web crawler. Before fetching a URL, you need to check: *"Have I already visited this page?"*

Simple — keep a set of visited URLs. Except you've crawled **10 billion pages**. Your set is 500 GB of RAM. It doesn't fit.

What if a data structure could tell you:
- **"definitely not visited"** — always correct
- **"probably visited"** — correct 99% of the time

…using **25× less memory** than a hash set?

---

## Example

```
bloom = BloomFilter(capacity=1_000_000, error_rate=0.01)

bloom.add("google.com")
bloom.add("github.com")

"google.com" in bloom   # True  — correct
"amazon.com" in bloom   # False — definitely NOT in set
"yahoo.com"  in bloom   # True  — rare false positive (~1% chance)
```

The filter **never** reports "not seen" for something you added. It only occasionally reports "seen" for something you didn't.

---

## Why It Matters

| System | How Bloom Filters Help |
| :--- | :--- |
| **Chrome Safe Browsing** | Locally check if a URL is *possibly* malicious; only call the server if the filter says maybe |
| **Cassandra / LevelDB / HBase** | Skip reading SSTables from disk when the key is definitely absent |
| **Bitcoin SPV wallets** | Filter relevant transactions without downloading the full blockchain |
| **Redis** | Built-in `BF.ADD` / `BF.EXISTS` commands since Redis Stack |
| **Akamai CDN** | Avoid caching "one-hit wonders" — only cache a URL after it's been requested twice |

In each case the same asymmetry applies: **a missed positive is cheap (one extra lookup); a false negative would be catastrophic**.

---

## Solution

A Bloom Filter is a **bit array** of size `m` plus **k independent hash functions**.

### Adding an Item

1. Run the item through all `k` hash functions.
2. Each produces an index in `[0, m)`.
3. Set those `k` bits to `1`.

### Checking Membership

1. Hash the item with the same `k` functions.
2. If **all k bits are 1** → "probably in set."
3. If **any bit is 0** → "definitely NOT in set."

### Why No False Negatives?

Adding only ever sets bits to `1`. They are never cleared. So every item you added will always pass the check — all its bits stay set forever.

### Why False Positives?

Different items can hash to overlapping positions. After many insertions, a new item's `k` positions might all be `1` by coincidence — causing a false alarm.

---

### Walkthrough

```
Bit array (size=10): [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
k = 3 hash functions

Add "cat":   h1=2, h2=5, h3=7
             [0, 0, 1, 0, 0, 1, 0, 1, 0, 0]

Add "dog":   h1=1, h2=5, h3=8
             [0, 1, 1, 0, 0, 1, 0, 1, 1, 0]

Check "cat"  → bits 2,5,7 → all 1 → "probably in set" ✓
Check "bird" → h1=1, h2=5, h3=8 → all 1 → FALSE POSITIVE ✗  (same slots as "dog")
Check "fish" → h1=3, h2=6, h3=9 → bit 3 is 0 → "definitely NOT in set" ✓
```

### Optimal Parameters

There are exact formulas to minimize false positives given a target capacity `n` and error rate `p`:

```
m (bits)       = -n × ln(p) / (ln 2)²
k (hash count) = (m / n) × ln 2
```

For 1 million items at 1% error rate: **m ≈ 9.6 million bits (1.2 MB)**. A Python set of the same URLs would be ~50 MB.

---

## Code

### Python

```python
import hashlib
import math


class BloomFilter:
    def __init__(self, capacity, error_rate=0.01):
        self.size = self._optimal_size(capacity, error_rate)
        self.hash_count = self._optimal_hash_count(self.size, capacity)
        self.bits = bytearray(self.size)

    def _optimal_size(self, n, p):
        return int(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hash_count(self, m, n):
        return max(1, int((m / n) * math.log(2)))

    def _hashes(self, item):
        data = item.encode() if isinstance(item, str) else item
        for i in range(self.hash_count):
            digest = hashlib.md5(data + i.to_bytes(2, "big")).hexdigest()
            yield int(digest, 16) % self.size

    def add(self, item):
        for idx in self._hashes(item):
            self.bits[idx] = 1

    def __contains__(self, item):
        return all(self.bits[idx] for idx in self._hashes(item))


if __name__ == "__main__":
    bf = BloomFilter(capacity=1_000_000, error_rate=0.01)

    visited = ["google.com", "github.com", "stackoverflow.com"]
    for url in visited:
        bf.add(url)

    print("google.com" in bf)         # True
    print("amazon.com" in bf)         # False — definitely not visited
    print("stackoverflow.com" in bf)  # True

    # Measure actual false positive rate
    false_positives = sum(
        1 for i in range(10_000) if f"fake-url-{i}.com" in bf
    )
    print(f"False positive rate: {false_positives / 10_000:.2%}")
```

### JavaScript

```javascript
const crypto = require("crypto");

class BloomFilter {
    constructor(capacity, errorRate = 0.01) {
        this.size = Math.ceil(
            (-capacity * Math.log(errorRate)) / Math.log(2) ** 2
        );
        this.hashCount = Math.max(
            1,
            Math.round((this.size / capacity) * Math.log(2))
        );
        this.bits = new Uint8Array(this.size);
    }

    _hashes(item) {
        return Array.from({ length: this.hashCount }, (_, i) => {
            const hash = crypto
                .createHash("md5")
                .update(item + String(i))
                .digest("hex");
            return parseInt(hash.slice(0, 8), 16) % this.size;
        });
    }

    add(item) {
        this._hashes(item).forEach((idx) => (this.bits[idx] = 1));
    }

    has(item) {
        return this._hashes(item).every((idx) => this.bits[idx] === 1);
    }
}

const bf = new BloomFilter(1_000_000, 0.01);

["google.com", "github.com", "stackoverflow.com"].forEach((url) =>
    bf.add(url)
);

console.log(bf.has("google.com"));         // true
console.log(bf.has("amazon.com"));         // false — definitely not visited
console.log(bf.has("stackoverflow.com"));  // true

// Measure actual false positive rate
const falsePositives = Array.from(
    { length: 10_000 },
    (_, i) => bf.has(`fake-url-${i}.com`)
).filter(Boolean).length;

console.log(`False positive rate: ${(falsePositives / 10_000 * 100).toFixed(2)}%`);
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time (add / lookup)** | O(k) — k hash computations, where k is typically 7–15 |
| **Space** | O(m) — the bit array; ~9.6 bits per item at 1% error rate |

For 1 million items:
- Hash set: ~50 MB
- Bloom filter (1% error): ~1.2 MB — **42× smaller**

Every halving of the error rate costs only ~1.44 extra bits per element. Space grows **logarithmically** with accuracy, not linearly.

---

## One Minute Insight

> A Bloom Filter is a deliberate, bounded lie. You trade **one direction of correctness** for enormous space savings. The key insight: in many systems, false positives are just *extra work* (one wasted disk read, one extra API call), while false negatives would be *silent failures* (serving a malicious URL, missing a cache entry). Design for the failure mode that actually hurts.

When you see the phrase "definitely not" in a system requirement — that's a Bloom Filter waiting to be born.

*Run `code.py` or `code.js` to see it in action, including the measured false positive rate.*
