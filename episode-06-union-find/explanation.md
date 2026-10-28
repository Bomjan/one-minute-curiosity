# Are We Connected? The Data Structure That Answers Instantly

Some friend circles form after just one introduction. Others take a chain of "a friend of a friend of a friend." Turns out there's a data structure that tracks every circle in your entire network — and can answer "are these two connected?" almost instantly, no matter how tangled the web gets.

---

## The Problem

You're building a social network. Two operations happen constantly:

1. **`union(a, b)`** — a and b become connected (they friend each other, or their groups merge).
2. **`connected(a, b)`** — are a and b in the same friend circle, directly or through a chain of mutual friends?

The naive approach: rebuild a graph and run BFS/DFS on every `connected()` query. With millions of users and constant updates, that's brutally slow.

**Your goal:** support both operations so that each one is close to **O(1)**, even after thousands of merges.

---

## Example

```
union(Alice, Bob)
union(Bob, Chen)
union(Diya, Emeka)

connected(Alice, Chen) → true   (Alice → Bob → Chen)
connected(Alice, Diya) → false  (different circles)

union(Chen, Diya)   // the two circles merge into one

connected(Alice, Emeka) → true  (one big circle now)
```

---

## Why It Matters

This pattern — called **Union-Find** (or **Disjoint Set Union**) — quietly powers a surprising amount of infrastructure:

| Domain | Real-World Use |
| :--- | :--- |
| **Networking** | Detecting whether two nodes can reach each other after link failures |
| **Databases** | Finding connected components for query optimization and clustering |
| **Graph theory** | Kruskal's algorithm for building a Minimum Spanning Tree |
| **Image processing** | Grouping adjacent pixels into regions (connected-component labeling) |
| **Version control** | Merging conflict-free branches / detecting related file changes |
| **Games** | Percolation and "is there a path from top to bottom" simulations |

The deeper lesson: **when merges are frequent and queries are constant, don't rebuild the graph — maintain a living answer.**

---

## Solution

### The Key Insight: Trees of Leaders, Flattened Aggressively

Each group is a tree. Every member points toward a **parent**, and the root of the tree is the group's "leader." To check if two people are connected, just walk up to their roots and compare.

Two tricks keep this fast:

1. **Path Compression** — every time you walk up to find a root, rewire every node along the way to point directly at that root. Future lookups become instant.
2. **Union by Rank** — when merging two groups, attach the *shorter* tree under the *taller* one. This keeps trees flat instead of turning into a long chain.

Together, these bring the amortized cost of both operations down to **O(1)** — technically O(α(n)), where α is the inverse Ackermann function, a number so small it's effectively constant for any input size you'll ever see.

### Step-by-Step Walkthrough

```
Start: everyone is their own leader
  Alice  Bob  Chen  Diya  Emeka
    ↓     ↓    ↓     ↓     ↓
   Alice Bob  Chen  Diya  Emeka

union(Alice, Bob) → Bob's tree attaches under Alice
   Alice          Chen   Diya   Emeka
    ↑
   Bob

union(Bob, Chen) → find(Bob) walks up to Alice, attaches Chen under Alice
   Alice
   ↑  ↑
  Bob Chen

connected(Alice, Chen)? find(Chen) → Alice, find(Alice) → Alice. Same root → true.
```

Every `find()` call compresses the path a little more, so the tree gets flatter every time it's used.

---

## Code

### Python

```python
class UnionFind:
    """Tracks connected groups and answers 'are these connected?' in ~O(1)."""

    def __init__(self, n):
        self.parent = list(range(n))   # everyone starts as their own leader
        self.rank = [0] * n            # rough "tree height" for smart merging

    def find(self, x):
        # Path compression: point straight at the root while we're here,
        # so the next lookup for x (and everyone we pass) is instant.
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already in the same group

        # Union by rank: hang the shorter tree under the taller one
        # so trees stay shallow instead of turning into a long chain.
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    names = ["Alice", "Bob", "Chen", "Diya", "Emeka", "Farah"]
    uf = UnionFind(len(names))

    uf.union(0, 1)  # Alice - Bob
    uf.union(1, 2)  # Bob - Chen
    uf.union(3, 4)  # Diya - Emeka

    print(uf.connected(0, 2))  # True
    print(uf.connected(0, 3))  # False

    uf.union(2, 3)  # circles merge
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
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false;

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
uf.union(0, 1); // Alice - Bob
uf.union(1, 2); // Bob - Chen
uf.union(3, 4); // Diya - Emeka

console.log(uf.connected(0, 2)); // true
console.log(uf.connected(0, 3)); // false

uf.union(2, 3); // circles merge
console.log(uf.connected(0, 4)); // true
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(α(n)) amortized per operation | Path compression + union by rank keep trees nearly flat; α is the inverse Ackermann function — effectively constant |
| **Space** | O(n) | One parent slot and one rank slot per element |

Without either optimization, a chain of unlucky unions can degrade `find()` to O(n) — a straight line instead of a tree. With both, that pathological case can't happen: the structure self-flattens as it's used.

---

## One Minute Insight

> **Some problems don't need a smarter query — they need a structure that remembers.** Union-Find never "computes" connectivity from scratch; it maintains the answer incrementally, so each new fact (a merge) makes every future question cheaper to answer.

That's the same instinct behind caching, indexes, and materialized views: when reads vastly outnumber writes, pay a tiny cost on write to make every read nearly free.

*Run `code.py` or `code.js` to see it in action.*
