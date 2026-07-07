# The Magic Hidden in the Last Bit: Fenwick Trees

> *"A tree with no pointers, no nodes, and no balancing — just an array and one bit trick."*

---

## The Problem

Imagine you're building a leaderboard for a game with millions of players. Every second, scores update. Every millisecond, someone asks: *"What's the total score of players ranked 1 through k?"*

Two naive approaches:

| Approach | Update | Query |
|---|---|---|
| Raw array | O(1) | O(n) — scan every element |
| Prefix sum array | O(n) — rebuild sums | O(1) |

Both fail when **updates and queries both happen constantly**.

Can you do **both in O(log n)**?

Yes — with a **Fenwick Tree**, also called a **Binary Indexed Tree (BIT)**. It's not a tree you'd draw on a whiteboard. It's a single flat array that organizes itself using the binary structure of array indices.

---

## Example

```
Initial array: [2, 1, 4, 7, 3, 5]
Indices:         1  2  3  4  5  6

query(4)  → sum of first 4 elements = 2+1+4+7 = 14   ✓
update(3, +2)  → add 2 to index 3 → arr[3] = 6
query(4)  → 2+1+6+7 = 16   ✓
query(6)  → 2+1+6+7+3+5 = 24   ✓
```

Both operations: **O(log n)** — even with millions of updates and queries interleaved.

---

## Why It Matters

Fenwick Trees are quietly powering a surprising range of real systems:

- **Competitive programming** — the go-to for range sum / point update problems
- **Database histograms** — efficiently maintaining value-frequency distributions
- **Order statistics** — "how many values in this dataset are ≤ x?"
- **Counting inversions** — a classic sorting-adjacent problem solved elegantly with BITs
- **2D range queries** — extend to a 2D grid for image processing or heatmaps

Any time you need *fast queries over a changing dataset*, a Fenwick Tree should be your first thought.

---

## Solution

### The Core Insight

Each index `i` in the BIT stores the sum of a range whose **length is determined by the lowest set bit of `i` in binary**.

```
Index 1 → binary 0001 → lowest set bit = 1 → stores sum of 1 element  (arr[1])
Index 2 → binary 0010 → lowest set bit = 2 → stores sum of 2 elements (arr[1..2])
Index 3 → binary 0011 → lowest set bit = 1 → stores sum of 1 element  (arr[3])
Index 4 → binary 0100 → lowest set bit = 4 → stores sum of 4 elements (arr[1..4])
Index 6 → binary 0110 → lowest set bit = 2 → stores sum of 2 elements (arr[5..6])
```

This means `bit[4]` secretly holds the sum of the first 4 elements, and `bit[6]` holds the sum of elements 5 and 6. **The structure emerges from the bit pattern — no pointers needed.**

### The Bit Trick

```
i & (-i)  →  isolates the lowest set bit of i
```

Why does `-i` work? In two's complement, negation flips all bits and adds 1. That carry propagation zeroes out everything above the lowest set bit and leaves it intact.

```
i  =  6   →  binary: 0110
-i =  -6  →  binary: 1010  (two's complement)
i & (-i)  →  0010  =  2
```

### Query: prefix sum up to index i

Walk **left** by stripping the lowest set bit each step:

```
query(6):
  add bit[6]  (covers indices 5–6)
  6 - (6 & -6) = 6 - 2 = 4
  add bit[4]  (covers indices 1–4)
  4 - (4 & -4) = 4 - 4 = 0
  done → result = bit[6] + bit[4]
```

### Update: add delta to index i

Walk **right** by adding the lowest set bit each step (propagate the change upward):

```
update(3, +2):
  update bit[3]  (covers index 3)
  3 + (3 & -3) = 3 + 1 = 4
  update bit[4]  (covers indices 1–4, so it must reflect this change)
  4 + (4 & -4) = 4 + 4 = 8
  update bit[8]  (covers indices 1–8)
  ... continue until out of bounds
```

That's the entire algorithm. Two loops. One bit trick. O(log n) per operation.

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
            i += i & (-i)  # move to next responsible index

    def query(self, i):
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # strip lowest set bit
        return total

    def range_query(self, left, right):
        return self.query(right) - self.query(left - 1)


# Usage
arr = [2, 1, 4, 7, 3, 5]
ft = FenwickTree(len(arr))

for i, val in enumerate(arr, 1):
    ft.update(i, val)

print(ft.query(4))          # 14 (sum of first 4: 2+1+4+7)
ft.update(3, 2)             # add 2 to index 3
print(ft.query(4))          # 16 (2+1+6+7)
print(ft.range_query(3, 6)) # 21 (6+7+3+5)
```

### JavaScript

```javascript
class FenwickTree {
  constructor(n) {
    this.n = n;
    this.tree = new Array(n + 1).fill(0); // 1-indexed
  }

  update(i, delta) {
    while (i <= this.n) {
      this.tree[i] += delta;
      i += i & (-i); // move to next responsible index
    }
  }

  query(i) {
    let total = 0;
    while (i > 0) {
      total += this.tree[i];
      i -= i & (-i); // strip lowest set bit
    }
    return total;
  }

  rangeQuery(left, right) {
    return this.query(right) - this.query(left - 1);
  }
}

// Usage
const arr = [2, 1, 4, 7, 3, 5];
const ft = new FenwickTree(arr.length);

arr.forEach((val, idx) => ft.update(idx + 1, val));

console.log(ft.query(4));           // 14 (2+1+4+7)
ft.update(3, 2);                    // add 2 to index 3
console.log(ft.query(4));           // 16 (2+1+6+7)
console.log(ft.rangeQuery(3, 6));   // 21 (6+7+3+5)
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| Build (n updates) | O(n log n) | O(n) |
| Point update | O(log n) | O(1) extra |
| Prefix query | O(log n) | O(1) extra |
| Range query | O(log n) | O(1) extra |

There's even an O(n) build trick: process each index and propagate directly, avoiding the repeated log n traversals.

---

## One Minute Insight

The Fenwick Tree is proof that **the right encoding of data can collapse complexity**. By letting the binary representation of an index *define* the range it's responsible for, you get a self-organizing hierarchical structure inside a plain array — no pointers, no rotations, no balancing logic. The entire "tree" is implicit in how you read the bits. Whenever you find yourself maintaining a running sum over a changing dataset, ask: *"Am I doing O(n) work that bits could do in O(log n)?"*
