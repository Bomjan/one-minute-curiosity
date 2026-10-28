# Six Degrees of Separation, But Make It O(1)

Somewhere inside every social network, every filesystem, and every Minecraft-style world generator lives the same tiny question: **"are these two things secretly part of the same group?"** There's a data structure built to answer that question almost instantly — even after millions of merges.

---

## The Problem

Imagine you're building a "People You May Know" feature. Friendships stream in one at a time — `connect(A, B)` — and at any moment someone asks: **"are A and B in the same friend circle, even indirectly?"**

You could re-run a graph search (BFS/DFS) on every query, but that's slow if you're doing this millions of times as the graph keeps growing.

What you actually want is a structure that can:
1. **Merge** two groups together, fast.
2. **Check** if two items are already in the same group, fast.

This is the **Union-Find** (a.k.a. Disjoint Set Union) problem — and the naive version is deceptively tempting to get wrong.

---

## Example

```
People: 0, 1, 2, 3, 4, 5

union(0, 1)   # 0 and 1 are now friends
union(1, 2)   # 2 joins their circle
union(4, 5)   # a separate circle forms

connected(0, 2) → True   (0 → 1 → 2)
connected(0, 4) → False  (different circles)

union(2, 4)   # the two circles merge into one

connected(0, 5) → True   (now all one big circle)
```

---

## Why It Matters

Union-Find quietly powers a surprising amount of real infrastructure:

| Domain | Real-World Use |
| :--- | :--- |
| **Graph theory** | Kruskal's Minimum Spanning Tree — skip edges that would form a cycle |
| **Networking** | Detecting whether two nodes are in the same connected component |
| **Image processing** | Labeling connected regions of pixels (connected-component labeling) |
| **Data engineering** | "Account merging" — deduplicating identities across emails/phones/logins |
| **Compilers** | Type unification in Hindley-Milner type inference |
| **Games** | Percolation / flood-fill style connectivity checks (e.g. Go, Minesweeper) |

The pattern is always the same: lots of pairwise merges, then constant connectivity checks.

---

## Solution

### The Naive Way (and why it's slow)

The obvious implementation: each node points to a "parent," and `find(x)` walks up parents until it hits a node that points to itself (the root). Two items are connected if they share a root.

Problem: if you always attach new trees carelessly, you can end up with a long chain — a linked list in disguise — where `find()` degrades to **O(n)** per call.

### Two Small Tricks Fix Everything

**1. Union by Rank** — when merging two groups, always attach the *shorter* tree under the *taller* one's root. This keeps trees flat instead of growing a long chain.

**2. Path Compression** — every time `find()` walks up to the root, it rewires every node it passed through to point *directly* at the root. The next lookup for any of those nodes is now instant.

Combined, these two tricks give you an amortized time complexity of **O(α(n))** per operation — where α is the *inverse Ackermann function*, a value that grows so slowly it's less than 5 for any n you could realistically store in a computer.

### Walkthrough

```
union(0, 1): tree looks like  1 → 0        (root: 0)
union(1, 2): find(1) walks to root 0, attaches 2 under 0
             tree:  0 ← 1, 0 ← 2           (root: 0)

find(2) is called:
  2 → 0 (already flat, no compression needed)

Now union(2, 4) merges the {0,1,2} circle with the {4,5} circle
by attaching one root directly under the other.

find(5) after this merge walks 5 → 4 → 0,
then COMPRESSES: 5 now points directly to 0.
The next find(5) is a single hop.
```

---

## Code

### Python

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        # Path compression: point every node on the way straight to the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: int, b: int) -> bool:
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

    def connected(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    dsu = UnionFind(6)
    dsu.union(0, 1)
    dsu.union(1, 2)
    dsu.union(4, 5)

    print(dsu.connected(0, 2))  # True
    print(dsu.connected(0, 4))  # False

    dsu.union(2, 4)
    print(dsu.connected(0, 5))  # True
```

### JavaScript

```javascript
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x) {
    // Path compression: point every node on the way straight to the root
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

const dsu = new UnionFind(6);
dsu.union(0, 1);
dsu.union(1, 2);
dsu.union(4, 5);

console.log(dsu.connected(0, 2)); // true
console.log(dsu.connected(0, 4)); // false

dsu.union(2, 4);
console.log(dsu.connected(0, 5)); // true
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(α(n)) amortized per operation | Union by rank keeps trees shallow; path compression flattens them further on every lookup |
| **Space** | O(n) | One parent slot and one rank slot per element |

Without the two optimizations, a worst-case implementation degrades to O(n) per `find()`. With both, α(n) stays below 5 even if n approaches the number of atoms in the observable universe — for all practical purposes, this is constant time.

---

## One Minute Insight

> **Flatten as you go.** Union-Find doesn't just solve connectivity — it demonstrates that a data structure can *get faster the more you use it*, because every lookup quietly repairs the structure for the next one.

The trick isn't a clever formula — it's laziness turned into an optimization. Don't fix the whole tree upfront; just fix the path you happen to be walking, right when you're already there.

*Run `code.py` or `code.js` to see it in action.*
