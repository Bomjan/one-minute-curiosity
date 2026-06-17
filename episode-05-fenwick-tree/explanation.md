# The Magic Tree Hiding Inside a Flat Array

A Fenwick Tree answers "sum of first k elements" and "update element i" in O(log n) each — using just a plain array, zero extra pointers, and one cryptic bit trick.

---

## The Problem

You're building a **real-time leaderboard** that tracks scores across 1 million players.

Two operations happen thousands of times per second:
1. **Update**: Player #412,337 just earned 500 points.
2. **Query**: What's the total score of all players ranked 1–50,000?

**Option A — Plain array:**
- Update: O(1) ✓
- Query (prefix sum): O(n) ✗

**Option B — Prefix sum array:**
- Update: O(n) ✗
- Query: O(1) ✓

Neither is fast enough. You need both in **O(log n)**.

---

## Example

```
scores = [3, 2, -1, 6, 5, 4]   (1-indexed)

prefix_sum(1..4) = 3+2+(-1)+6 = 10
update(3, +10)                  # scores[3] += 10
prefix_sum(1..4) = 3+2+9+6    = 20
```

---

## Why It Matters

| Domain | Where It Appears |
| :--- | :--- |
| **Databases** | Order statistics: "rank of element X" in O(log n) |
| **Competitive programming** | Range-sum queries with frequent updates |
| **Search engines** | Dynamic frequency tables in inverted indexes |
| **Computational geometry** | Sweepline algorithms counting points to the left |
| **Real-time analytics** | Streaming percentile estimation |

The Fenwick Tree was published by Peter Fenwick in 1994. It remains one of the most compact data structures ever — 10 lines of code that replace an entire balanced BST.

---

## Solution

### The Bit Magic: `i & (-i)`

In two's complement arithmetic, `-i` flips all bits of `i` and adds 1. The result is that `i & (-i)` isolates the **lowest set bit** of `i`.

```
i  =  6  →  binary: 0110
-i = -6  →  binary: 1010  (flip all bits, then +1)
i & (-i) = 0010 = 2       ← lowest set bit isolated
```

### The Core Insight

Each index `i` in the Fenwick Tree is responsible for a range of **exactly `i & (-i)` elements** ending at `i`.

```
Index 1 = 001₂  →  range 1  →  covers [1]
Index 2 = 010₂  →  range 2  →  covers [1, 2]
Index 3 = 011₂  →  range 1  →  covers [3]
Index 4 = 100₂  →  range 4  →  covers [1, 2, 3, 4]
Index 5 = 101₂  →  range 1  →  covers [5]
Index 6 = 110₂  →  range 2  →  covers [5, 6]
Index 7 = 111₂  →  range 1  →  covers [7]
Index 8 = 1000₂ →  range 8  →  covers [1..8]
```

**Query** (prefix sum up to `i`):
Strip the lowest set bit repeatedly — `i -= i & (-i)` — accumulates partial sums walking toward index 0.

**Update** (add `delta` at index `i`):
Add the lowest set bit repeatedly — `i += i & (-i)` — propagates the delta to every node responsible for covering `i`.

---

### Step-by-Step Query Walkthrough

```
prefix_sum(6):

i = 6  (110₂)  →  tree[6] covers [5, 6]  →  accumulate tree[6]
i -= 6 & (-6) = 2  →  i = 4
i = 4  (100₂)  →  tree[4] covers [1..4]  →  accumulate tree[4]
i -= 4 & (-4) = 4  →  i = 0
i = 0  →  stop

Answer = tree[4] + tree[6]  ✓  (exact sum of elements 1..6)
```

Even for n = 1,000,000, the loop runs at most **log₂(1,000,000) ≈ 20 iterations**.

---

## Code

### Python

```python
class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed

    def update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # move to next responsible ancestor

    def prefix_sum(self, i):
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # strip lowest set bit, walk toward root
        return total

    def range_sum(self, l, r):
        return self.prefix_sum(r) - self.prefix_sum(l - 1)


if __name__ == "__main__":
    scores = [3, 2, -1, 6, 5, 4]
    ft = FenwickTree(len(scores))

    for i, val in enumerate(scores, start=1):
        ft.update(i, val)

    print(ft.prefix_sum(4))    # 10  (3 + 2 + (-1) + 6)
    print(ft.range_sum(3, 6))  # 14  ((-1) + 6 + 5 + 4)

    ft.update(3, 10)           # scores[3] += 10
    print(ft.prefix_sum(4))    # 20  (3 + 2 + 9 + 6)
```

### JavaScript

```javascript
class FenwickTree {
    constructor(n) {
        this.n = n;
        this.tree = new Array(n + 1).fill(0); // 1-indexed
    }

    update(i, delta) {
        for (; i <= this.n; i += i & (-i))
            this.tree[i] += delta; // move to next responsible ancestor
    }

    prefixSum(i) {
        let total = 0;
        for (; i > 0; i -= i & (-i))
            total += this.tree[i]; // strip lowest set bit, walk toward root
        return total;
    }

    rangeSum(l, r) {
        return this.prefixSum(r) - this.prefixSum(l - 1);
    }
}

const scores = [3, 2, -1, 6, 5, 4];
const ft = new FenwickTree(scores.length);

scores.forEach((val, idx) => ft.update(idx + 1, val));

console.log(ft.prefixSum(4));    // 10  (3 + 2 + (-1) + 6)
console.log(ft.rangeSum(3, 6));  // 14  ((-1) + 6 + 5 + 4)

ft.update(3, 10);                // scores[3] += 10
console.log(ft.prefixSum(4));    // 20  (3 + 2 + 9 + 6)
```

---

## Complexity

| Operation | Time | Space |
| :--- | :--- | :--- |
| **Build** | O(n log n) | O(n) |
| **Update** | O(log n) | O(1) auxiliary |
| **Prefix query** | O(log n) | O(1) auxiliary |
| **Range query** | O(log n) | O(1) auxiliary |

Compare to a naive prefix-sum array: O(n) update, O(1) query. The Fenwick Tree trades a tiny constant on queries for a dramatic speedup on updates.

---

## One Minute Insight

> **The binary representation of an index IS its place in the tree.**

Peter Fenwick didn't design a tree and then figure out how to flatten it into an array — he started with bit patterns and discovered that `i & (-i)` encodes an entire implicit tree. No pointers. No nodes. No heap allocations. Just an array and two arithmetic operations.

When you strip the lowest set bit, you're walking toward the root. When you add it, you're spreading a change upward to every ancestor. The whole tree lives inside the numbers themselves.

*Run `code.py` or `code.js` to see it in action.*
