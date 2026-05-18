# The Data Structure That Never Lies About Absence

> *"I can tell you for certain that something is NOT here. But if I say it IS here… I'm only probably right."*

---

## The Problem

You're building a system that processes **billions of URLs**. Before hitting the database, you want a lightning-fast pre-check: *"Have we seen this URL before?"*

Storing every URL in a hash set works — until RAM runs out. A billion URLs × ~50 bytes each = **~50 GB**. Just for a "have we seen this?" check.

**Can you answer that question in O(1) time using only a few megabytes?**

Yes — with a **Bloom Filter**.

A Bloom Filter is a probabilistic data structure that uses a **bit array** and **multiple hash functions** to track membership. It makes a deal with you:

- **"Definitely NOT in the set"** → 100% accurate. Always trust this.
- **"Probably IN the set"** → Might be a false positive. Never trust this blindly.

It can never produce a **false negative**. It can produce a **false positive** — and you can tune how often.

---

## Example

```
Bloom filter with 20 bits, 3 hash functions.

INSERT "alice@example.com"
  hash1("alice") → bit 3 ✓
  hash2("alice") → bit 9 ✓
  hash3("alice") → bit 17 ✓

INSERT "bob@example.com"
  hash1("bob") → bit 1 ✓
  hash2("bob") → bit 7 ✓
  hash3("bob") → bit 3 ✓  (bit 3 already set — that's fine)

QUERY "alice@example.com"
  bits 3, 9, 17 → all set → "Probably YES" ✅

QUERY "carol@example.com"
  hash1("carol") → bit 5 → NOT set → "Definitely NO" ✅

QUERY "dave@example.com"
  hash1("dave") → bit 1 → set
  hash2("dave") → bit 7 → set
  hash3("dave") → bit 3 → set
  → "Probably YES" ⚠️  (false positive — dave was never inserted!)
```

---

## Why It Matters

Bloom filters are used in production at **massive scale**:

| System | Use Case |
|---|---|
| **Google Chrome** | Safe Browsing — checks URLs against malicious list locally |
| **Apache Cassandra** | Avoids disk reads for keys that don't exist |
| **Bitcoin** | Lightweight node transaction filtering |
| **Redis** | RedisBloom module for deduplication |
| **Medium** | "Don't show articles the user already read" |
| **Akamai CDN** | One-hit-wonder detection to avoid caching single-request items |

The trick: a single wrong answer (false positive) is **cheap** — you just do a real database lookup as fallback. But **eliminating 99% of unnecessary lookups** with a 1 MB structure instead of 50 GB is pure engineering gold.

---

## Solution

**Core idea:**
1. Allocate a bit array of size `m` (all zeros)
2. Choose `k` independent hash functions
3. **Insert**: run all `k` hashes on the item → set those `k` bits to 1
4. **Query**: run all `k` hashes → if *any* bit is 0 → definitely absent; if *all* bits are 1 → probably present

**Tuning false positive rate:**

The false positive probability `p` is:

```
p ≈ (1 - e^(-kn/m))^k
```

Where:
- `m` = number of bits
- `n` = number of inserted items
- `k` = number of hash functions

Optimal `k = (m/n) × ln(2)` minimizes false positives.

**Rule of thumb**: ~10 bits per item gives roughly 1% false positive rate with optimal `k`.

**Walkthrough:**
- You want 1M items with 1% false positive rate
- You need `m = -n × ln(p) / (ln 2)²` ≈ **9.59 million bits** (~1.2 MB)
- Optimal `k = 7` hash functions
- That's 1.2 MB instead of ~50 MB for a hash set — and O(1) lookups

---

## Code

### Python

```python
import math
import hashlib


class BloomFilter:
    def __init__(self, capacity: int, false_positive_rate: float = 0.01):
        self.capacity = capacity
        self.fpr = false_positive_rate
        self.bit_count = self._optimal_bit_count(capacity, false_positive_rate)
        self.hash_count = self._optimal_hash_count(self.bit_count, capacity)
        self.bits = bytearray(math.ceil(self.bit_count / 8))

    def _optimal_bit_count(self, n: int, p: float) -> int:
        return math.ceil(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hash_count(self, m: int, n: int) -> int:
        return max(1, round((m / n) * math.log(2)))

    def _hash_positions(self, item: str):
        positions = []
        for seed in range(self.hash_count):
            digest = hashlib.sha256(f"{seed}:{item}".encode()).hexdigest()
            pos = int(digest, 16) % self.bit_count
            positions.append(pos)
        return positions

    def add(self, item: str):
        for pos in self._hash_positions(item):
            self.bits[pos // 8] |= (1 << (pos % 8))

    def __contains__(self, item: str) -> bool:
        return all(
            self.bits[pos // 8] & (1 << (pos % 8))
            for pos in self._hash_positions(item)
        )

    def __repr__(self):
        return (
            f"BloomFilter(capacity={self.capacity}, fpr={self.fpr}, "
            f"bits={self.bit_count}, hashes={self.hash_count}, "
            f"memory={math.ceil(self.bit_count / 8 / 1024)} KB)"
        )


if __name__ == "__main__":
    bf = BloomFilter(capacity=1_000_000, false_positive_rate=0.01)
    print(bf)

    emails = ["alice@x.com", "bob@x.com", "carol@x.com"]
    for email in emails:
        bf.add(email)

    print("alice@x.com in filter:", "alice@x.com" in bf)    # True (inserted)
    print("dave@x.com in filter:", "dave@x.com" in bf)      # False (not inserted)
    print("eve@x.com in filter:", "eve@x.com" in bf)        # Probably False
```

---

### JavaScript

```javascript
const crypto = require("crypto");

class BloomFilter {
  constructor(capacity, falsePositiveRate = 0.01) {
    this.capacity = capacity;
    this.fpr = falsePositiveRate;
    this.bitCount = this.#optimalBitCount(capacity, falsePositiveRate);
    this.hashCount = this.#optimalHashCount(this.bitCount, capacity);
    this.bits = new Uint8Array(Math.ceil(this.bitCount / 8));
  }

  #optimalBitCount(n, p) {
    return Math.ceil((-n * Math.log(p)) / Math.log(2) ** 2);
  }

  #optimalHashCount(m, n) {
    return Math.max(1, Math.round((m / n) * Math.log(2)));
  }

  #hashPositions(item) {
    const positions = [];
    for (let seed = 0; seed < this.hashCount; seed++) {
      const hash = crypto
        .createHash("sha256")
        .update(`${seed}:${item}`)
        .digest("hex");
      const pos = BigInt("0x" + hash) % BigInt(this.bitCount);
      positions.push(Number(pos));
    }
    return positions;
  }

  add(item) {
    for (const pos of this.#hashPositions(item)) {
      this.bits[Math.floor(pos / 8)] |= 1 << pos % 8;
    }
  }

  has(item) {
    return this.#hashPositions(item).every(
      (pos) => this.bits[Math.floor(pos / 8)] & (1 << pos % 8)
    );
  }

  toString() {
    return `BloomFilter(capacity=${this.capacity}, fpr=${this.fpr}, bits=${this.bitCount}, hashes=${this.hashCount}, memory=${Math.ceil(this.bitCount / 8 / 1024)} KB)`;
  }
}

const bf = new BloomFilter(1_000_000, 0.01);
console.log(bf.toString());

["alice@x.com", "bob@x.com", "carol@x.com"].forEach((e) => bf.add(e));

console.log("alice@x.com:", bf.has("alice@x.com")); // true
console.log("dave@x.com:", bf.has("dave@x.com"));   // false
console.log("eve@x.com:", bf.has("eve@x.com"));     // false
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| **Insert** | O(k) | — |
| **Query** | O(k) | — |
| **Storage** | — | O(m) bits |

Where `k` = number of hash functions (constant, typically 5–10), and `m` = bit array size (tunable).

Compare to a hash set:
- **Hash set**: O(1) time, O(n × item_size) space
- **Bloom filter**: O(k) time (same order), O(m) space where `m << n × item_size`

For 1M items at 1% FPR: **1.2 MB** vs ~**50 MB** for a hash set. At 1B items: **~1.2 GB** vs **~50 GB**.

---

## One Minute Insight

> A Bloom Filter trades a small probability of being wrong for a massive reduction in memory — and it **never** makes the dangerous mistake of saying something is absent when it's actually present. In engineering, a system that *fails safe* (false positives) is far more valuable than one that *fails silently* (false negatives). That's why Bloom filters guard the gates of some of the world's largest databases.
