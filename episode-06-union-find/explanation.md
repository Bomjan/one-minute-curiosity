# The Structure That Answers "Are We Connected?" Almost Instantly

Imagine a social network with a billion accounts and a billion friendships forming every second. Someone asks: "Are Alice and Bob in the same friend circle?" You can't re-scan the whole graph every time. There's a structure built exactly for this — and it barely does any work.

---

## The Problem

You're given a stream of **union** operations — pairs of items that get merged into the same group — and you need to answer **find** queries: "are these two items in the same group?"

```
union(1, 2)
union(2, 3)
union(4, 5)

connected(1, 3)  → true   (1-2-3 are merged)
connected(1, 4)  → false  (different group)
```

Naively, you could re-run a graph traversal (BFS/DFS) on every query — but that's **O(n)** per question, and with millions of unions and queries, it grinds to a halt.

**The goal:** support both `union` and `find` in *almost* constant time, no matter how large the dataset grows.

---

## Example

```
Items: 0, 1, 2, 3, 4, 5

union(0, 1)
union(1, 2)
union(3, 4)

find(0) == find(2)   → True   (0 and 2 share a root → connected)
find(0) == find(4)   → False  (different trees)

union(2, 3)

find(0) == find(4)   → True   (merging 2 and 3 joined the two groups)
```

---

## Why It Matters

The **Union-Find** (a.k.a. Disjoint Set Union) structure is one of the quiet workhorses of computer science:

| Domain | Real-World Use |
| :--- | :--- |
| **Graph theory** | Kruskal's algorithm for Minimum Spanning Trees |
| **Networking** | Detecting connected components as links go up/down |
| **Databases** | Query optimizers merging equivalent join conditions |
| **Image processing** | Labeling connected regions of pixels |
| **Games** | Percolation / "is there a path from top to bottom?" |
| **Compilers** | Type inference (unifying type variables) |

Anywhere you need to track "which things belong together" under constant merging, Union-Find beats re-traversing a graph from scratch.

---

## Solution

### The Key Insight: Trees With Shortcuts

Each group is a tree. Every item points to a **parent**; the root of the tree is the group's "representative." To check if two items are connected, just walk up to their roots and compare.

The trick is keeping those trees *flat*, using two small optimizations:

1. **Union by Rank** — when merging two trees, attach the smaller (shorter) tree under the root of the taller one. This keeps trees from growing tall.
2. **Path Compression** — while walking up to find a root, rewire every node along the way to point *directly* at the root. Future lookups become instant.

Together, these two tricks push the amortized cost of each operation down to **O(α(n))** — the inverse Ackermann function — which is so slow-growing it's effectively constant (never more than 4 or 5 for any input size you'll encounter in practice).

### Step-by-Step Walkthrough

```
Start: 6 items, each its own parent (own group)
parent = [0, 1, 2, 3, 4, 5]

union(0, 1): root(0)=0, root(1)=1 → attach 1 under 0
parent = [0, 0, 2, 3, 4, 5]

union(1, 2): root(1)=0, root(2)=2 → attach 2 under 0
parent = [0, 0, 0, 3, 4, 5]

find(2): walk 2 → 0 (root). Path compression: 2 now points straight at 0.

union(3, 4): attach 4 under 3
parent = [0, 0, 0, 3, 3, 5]

find(0) == find(4)? → root(0)=0, root(4)=3 → False, still separate groups

union(2, 3): root(2)=0, root(3)=3 → attach 3's tree under 0
parent = [0, 0, 0, 0, 3, 5]

find(0) == find(4)? → root(0)=0, root(4)=0 → True, now connected!
```

---

## Code

### Python

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        # Path compression: point every visited node straight at the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already connected

        # Union by rank: attach the shorter tree under the taller one
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    uf = UnionFind(6)
    uf.union(0, 1)
    uf.union(1, 2)
    uf.union(3, 4)

    print(uf.connected(0, 2))  # True
    print(uf.connected(0, 4))  # False

    uf.union(2, 3)
    print(uf.connected(0, 4))  # True
```

### JavaScript

```javascript
class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        // Path compression: point every visited node straight at the root
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false; // already connected

        // Union by rank: attach the shorter tree under the taller one
        if (this.rank[rootA] < this.rank[rootB]) [rootA, rootB] = [rootB, rootA];
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) this.rank[rootA]++;
        return true;
    }

    connected(a, b) {
        return this.find(a) === this.find(b);
    }
}

const uf = new UnionFind(6);
uf.union(0, 1);
uf.union(1, 2);
uf.union(3, 4);

console.log(uf.connected(0, 2)); // true
console.log(uf.connected(0, 4)); // false

uf.union(2, 3);
console.log(uf.connected(0, 4)); // true
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(α(n)) amortized per operation | Union by rank keeps trees shallow; path compression flattens them further with every lookup |
| **Space** | O(n) | One parent slot and one rank slot per item |

Without the two optimizations, a naive union-find degrades to O(n) per operation (a long chain). With both, millions of unions and queries run in what is, for all practical purposes, constant time.

---

## One Minute Insight

> **Laziness, done right, is an algorithm.** Path compression doesn't do extra work upfront — it just refuses to redo work it's already done, one lookup at a time.

Union-Find never "figures out" the full structure of your data. It just answers each question a little better than the last, until the tree is nearly flat and every answer is instant. That's the pattern behind a lot of great engineering: don't precompute everything — let usage itself do the optimizing.

*Run `code.py` or `code.js` to see it in action.*
