# Merging Worlds in Almost O(1)

Some of the most useful questions in computing aren't "what's the shortest path" — they're the much simpler "are these two things even in the same group?" Answering that a million times, while the groups keep merging, is its own beautiful puzzle.

---

## The Problem

Picture an archipelago of islands with no bridges. Over time, engineers build bridges connecting pairs of islands, and at any moment someone might ask: **"can I sail from island A to island B?"**

You need a structure that supports two operations, over and over, as fast as possible:

1. `union(a, b)` — build a bridge, merging a's group with b's group.
2. `connected(a, b)` — are a and b in the same group right now?

The naive fix — re-run a graph traversal (BFS/DFS) on every `connected()` call — is **O(n)** per query. With millions of unions and queries, that's brutally slow.

Can you answer both operations in **almost constant time**, no matter how large the graph gets?

---

## Example

```
6 islands, no bridges: {0} {1} {2} {3} {4} {5}

union(0, 1)   →  {0,1} {2} {3} {4} {5}
union(1, 2)   →  {0,1,2} {3} {4} {5}
union(3, 4)   →  {0,1,2} {3,4} {5}

connected(0, 2)  → true   (same group)
connected(0, 3)  → false  (different groups)

union(2, 3)   →  {0,1,2,3,4} {5}

connected(0, 4)  → true   (bridge chain joined the groups)
connected(0, 5)  → false  (island 5 is still isolated)
```

---

## Why It Matters

This structure — the **Disjoint Set Union (Union-Find)** — quietly powers a huge slice of real systems:

| Domain | Real-World Use |
| :--- | :--- |
| **Graph theory** | Kruskal's algorithm builds a Minimum Spanning Tree by union-ing edges, skipping any that would form a cycle |
| **Networking** | Detecting whether two nodes in a network are reachable after link failures |
| **Image processing** | Labeling connected components (blobs of matching pixels) in a scanned image |
| **Compilers** | Type inference (Hindley-Milner) unifies type variables using union-find under the hood |
| **Distributed systems** | Tracking which servers currently belong to the same partition after a merge |
| **Games** | Percolation and "does this maze have a solution" simulations |

The pattern is universal: whenever you're merging groups and repeatedly asking "same group or not," union-find turns an O(n) traversal into a near-instant lookup.

---

## Solution

### The Key Insight: Trees, Not Traversals

Represent each group as a tree, where every node points to a parent, and the root is the group's "representative." Two elements are connected exactly when they share the same root.

- `find(x)` walks up parent pointers until it hits the root.
- `union(a, b)` finds both roots and points one at the other.

That alone is already fast, but two small tricks make it *ridiculously* fast:

1. **Path compression** — while walking up during `find`, rewire every node directly to the root. The next lookup for any of those nodes is now instant.
2. **Union by rank** — always attach the shorter tree under the taller one, so trees stay flat instead of degenerating into long chains.

### Step-by-Step Walkthrough

```
Start:     0   1   2   3   4   5      (everyone is their own root)

union(0,1): 1 becomes root of 0        parent: [1,1,2,3,4,5]
union(1,2): 2 becomes root of {0,1}    parent: [1,2,2,3,4,5]
union(3,4): 4 becomes root of 3        parent: [1,2,2,4,4,5]

find(0): 0 -> 1 -> 2 (root)
  path compression rewires: parent[0] = 2, parent[1] = 2

connected(0,2)? find(0)=2, find(2)=2 -> true
connected(0,3)? find(0)=2, find(3)=4 -> false

union(2,3): attach one root under the other -> everyone from 0-4 shares a root

connected(0,4)? -> true
connected(0,5)? -> false (5 was never unioned)
```

Combined, these two tricks give an amortized time per operation of **O(α(n))** — the *inverse Ackermann function*, a value so slow-growing it's effectively **4 or less for any input size you'll ever encounter in practice.**

---

## Code

### Python

```python
class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))  # everyone starts as their own island
        self.rank = [0] * n           # rough "height" of each tree

    def find(self, x):
        # Path compression: rewire every node on the way to the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already the same island

        # Union by rank: hang the shorter tree under the taller one
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    islands = DisjointSet(6)
    islands.union(0, 1)
    islands.union(1, 2)
    islands.union(3, 4)

    print(islands.connected(0, 2))  # True
    print(islands.connected(0, 3))  # False

    islands.union(2, 3)

    print(islands.connected(0, 4))  # True
    print(islands.connected(0, 5))  # False
```

### JavaScript

```javascript
class DisjointSet {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false;

        if (this.rank[rootA] < this.rank[rootB]) {
            [rootA, rootB] = [rootB, rootA];
        }
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) {
            this.rank[rootA] += 1;
        }
        return true;
    }

    connected(a, b) {
        return this.find(a) === this.find(b);
    }
}

const islands = new DisjointSet(6);
islands.union(0, 1);
islands.union(1, 2);
islands.union(3, 4);

console.log(islands.connected(0, 2)); // true
console.log(islands.connected(0, 3)); // false

islands.union(2, 3);

console.log(islands.connected(0, 4)); // true
console.log(islands.connected(0, 5)); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(α(n)) amortized per operation | Path compression + union by rank keep trees nearly flat; α is the inverse Ackermann function, practically ≤ 4 |
| **Space** | O(n) | One parent slot and one rank slot per element |

Without the two optimizations, a naive union-find degrades to O(n) per `find` in the worst case (a long chain). With both, it's about as close to O(1) as a non-constant function can get.

---

## One Minute Insight

> **Flatten the structure you query most.** Union-find doesn't avoid work — it *pays it once* (path compression during a `find`) so every future query on that path is free. The same idea shows up in memoization, caching, and CDN edge nodes: the first request does the hard work, every request after rides the shortcut.

*Run `code.py` or `code.js` to see it in action.*
