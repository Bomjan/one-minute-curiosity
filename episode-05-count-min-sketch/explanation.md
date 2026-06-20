# The Data Structure That Counts a Billion Things in Kilobytes

> *"A Bloom Filter tells you IF something exists. A Count-Min Sketch tells you HOW MANY TIMES it does — using the same pocket of RAM."*

---

## The Problem

You're building Twitter's trending engine. Every second, **millions of tweets** stream in. You need to answer in real time:

**"How many times has #WorldCup appeared in the last hour?"**

The obvious solution: a hash map of `word → count`. Simple, exact. But at Twitter scale — billions of unique tokens per day — that hash map will consume **gigabytes of RAM** just for counting.

What if you could estimate any word's frequency with a fixed-size structure measured in **kilobytes**, and be wrong by only a small, mathematically provable amount?

That's the **Count-Min Sketch**.

---

## Example

```
Stream: ["cat", "dog", "cat", "fish", "cat", "dog", "cat"]

Exact counts:  cat → 4,  dog → 2,  fish → 1

Count-Min Sketch estimates:
  query("cat")  → 4  ✅ (exact or slight overestimate)
  query("dog")  → 2  ✅
  query("fish") → 1  ✅
  query("bird") → 0  ✅ (never inserted)
```

Unlike a Bloom Filter, a Count-Min Sketch **never under-counts** — it can only over-count, and by a bounded amount.

---

## Why It Matters

| System | Use Case |
|---|---|
| **Twitter / X** | Real-time trending topic frequency estimation |
| **Network routers** | Detecting traffic spikes and DDoS flows |
| **Apache Flink** | Stream processing heavy-hitter detection |
| **PostgreSQL / ClickHouse** | Query plan optimizations via frequency sketches |
| **NLP pipelines** | Token frequency over massive corpora |
| **Spam filters** | Scoring email patterns without storing every pattern |

The key insight: in stream processing, you rarely need **exact** counts. A guaranteed upper bound with a provable error margin is often enough to make real decisions.

---

## Solution

A Count-Min Sketch is a **2D counter array** with dimensions `d × w`:

- `d` = depth (number of independent hash functions, one per row)
- `w` = width (number of columns per row)

**Insert** an item:
- Apply each of the `d` hash functions to the item → get `d` column indices
- Increment the counter at `(row_i, col_i)` for each row

**Query** an item's frequency:
- Apply the same `d` hash functions → get `d` column indices
- Return the **minimum** of all `d` counters

**Why minimum?** Hash collisions cause counters to be inflated (over-counted), never deflated. Taking the minimum across `d` independent hash functions suppresses the noise — because it's unlikely that ALL rows have a collision at the same cell for the same item.

**Error guarantee:** With `w = ⌈e / ε⌉` and `d = ⌈ln(1/δ)⌉`:

```
Estimated count ≤ True count + ε × N    with probability ≥ 1 - δ
```

Where `N` = total items inserted, `ε` = relative error, `δ` = failure probability.

**Concrete example:** With `ε = 0.01` and `δ = 0.01`:
- `w = 272` columns, `d = 5` rows = **1,360 counters total**
- Estimates any frequency within `1%` of total stream size, with `99%` confidence
- Fixed memory regardless of stream length

---

## Code

### Python

```python
import hashlib
import math


class CountMinSketch:
    def __init__(self, epsilon: float = 0.01, delta: float = 0.01):
        self.w = math.ceil(math.e / epsilon)
        self.d = math.ceil(math.log(1 / delta))
        self.table = [[0] * self.w for _ in range(self.d)]
        self.total = 0

    def _hash(self, item: str, row: int) -> int:
        digest = hashlib.md5(f"{row}:{item}".encode()).hexdigest()
        return int(digest, 16) % self.w

    def update(self, item: str, count: int = 1):
        self.total += count
        for row in range(self.d):
            self.table[row][self._hash(item, row)] += count

    def query(self, item: str) -> int:
        return min(self.table[row][self._hash(item, row)] for row in range(self.d))

    def __repr__(self):
        return (
            f"CountMinSketch(w={self.w}, d={self.d}, "
            f"cells={self.w * self.d}, total_items={self.total})"
        )


if __name__ == "__main__":
    cms = CountMinSketch(epsilon=0.01, delta=0.01)
    print(cms)

    stream = ["#WorldCup"] * 500 + ["#AI"] * 200 + ["#Python"] * 80 + ["#Rust"] * 15

    for token in stream:
        cms.update(token)

    print(f"#WorldCup  → {cms.query('#WorldCup')}")   # ~500
    print(f"#AI        → {cms.query('#AI')}")          # ~200
    print(f"#Python    → {cms.query('#Python')}")      # ~80
    print(f"#Rust      → {cms.query('#Rust')}")        # ~15
    print(f"#Java      → {cms.query('#Java')}")        # ~0 (not inserted)
```

---

### JavaScript

```javascript
const crypto = require("crypto");

class CountMinSketch {
  constructor(epsilon = 0.01, delta = 0.01) {
    this.w = Math.ceil(Math.E / epsilon);
    this.d = Math.ceil(Math.log(1 / delta));
    this.table = Array.from({ length: this.d }, () => new Int32Array(this.w));
    this.total = 0;
  }

  _hash(item, row) {
    const digest = crypto.createHash("md5").update(`${row}:${item}`).digest("hex");
    return Number(BigInt("0x" + digest) % BigInt(this.w));
  }

  update(item, count = 1) {
    this.total += count;
    for (let row = 0; row < this.d; row++) {
      this.table[row][this._hash(item, row)] += count;
    }
  }

  query(item) {
    return Math.min(...Array.from({ length: this.d }, (_, row) => this.table[row][this._hash(item, row)]));
  }

  toString() {
    return `CountMinSketch(w=${this.w}, d=${this.d}, cells=${this.w * this.d}, total=${this.total})`;
  }
}

const cms = new CountMinSketch(0.01, 0.01);
console.log(cms.toString());

const stream = [
  ...Array(500).fill("#WorldCup"),
  ...Array(200).fill("#AI"),
  ...Array(80).fill("#Python"),
  ...Array(15).fill("#Rust"),
];

stream.forEach((token) => cms.update(token));

console.log("#WorldCup →", cms.query("#WorldCup")); // ~500
console.log("#AI       →", cms.query("#AI"));       // ~200
console.log("#Python   →", cms.query("#Python"));   // ~80
console.log("#Rust     →", cms.query("#Rust"));     // ~15
console.log("#Java     →", cms.query("#Java"));     // ~0
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| **Insert** | O(d) | — |
| **Query** | O(d) | — |
| **Storage** | — | O(d × w) |

Since `d` and `w` are constants derived from your error parameters (not from stream length `n`):

- **Time per op**: effectively O(1)
- **Space**: fixed, regardless of how many items you insert

With `ε=0.01, δ=0.01`: **1,360 integer cells** — roughly **5 KB** — to track frequencies over an infinite stream.

Compare to a hash map: O(n) space that grows forever with the stream.

---

## One Minute Insight

> The Count-Min Sketch is proof that you don't need exact answers to make exact decisions. By letting hash collisions only inflate counts (never deflate them) and taking the minimum across multiple independent hash functions, you get a guaranteed upper bound on any frequency — in fixed memory, at stream speed. It's one of the most practical applications of the principle: *controlled, bounded error beats unbounded resource usage every time.*
