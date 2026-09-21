# Are We Connected? The Trick Behind Instant Network Queries

Picture a growing social network. Every second, someone hits "add friend," and somewhere else, someone asks: *"Are these two people in the same friend group?"* Checking that by walking the friendship graph every time would grind a billion-user app to a halt. There's a data structure built exactly for this — and it barely does any work at all.

---

## The Problem

You're given a set of `n` elements, initially all in their own separate group. You need to support two operations, fired in any order, potentially millions of times:

1. **`union(a, b)`** — merge the group containing `a` with the group containing `b`.
2. **`connected(a, b)`** — return `true` if `a` and `b` are currently in the same group.

The naive approach: model everything as a graph and run BFS/DFS on every `connected()` call. That's **O(n)** per query — brutal at scale.

**Can you answer "are we connected?" almost instantly, even after millions of merges?**

---

## Example

```
Start: {0} {1} {2} {3} {4} {5}   ← 6 people, all strangers

union(0, 1)   → {0,1} {2} {3} {4} {5}
union(2, 3)   → {0,1} {2,3} {4} {5}
union(1, 3)   → {0,1,2,3} {4} {5}

connected(0, 2) → true   (both merged into the same group)
connected(0, 4) → false  (4 was never joined to anything)

union(4, 5)   → {0,1,2,3} {4,5}
connected(4, 5) → true
```

---

## Why It Matters

This exact pattern — called **Union-Find** or **Disjoint Set Union (DSU)** — quietly powers systems you use daily:

| Domain | Real-World Use |
| :--- | :--- |
| **Networking** | Checking if two nodes are in the same connected partition after link failures |
| **Databases** | Entity resolution — merging duplicate records that turn out to be "the same person" |
| **Graph theory** | Kruskal's algorithm for building a Minimum Spanning Tree (cheapest way to connect a network) |
| **Image processing** | Labeling connected regions of pixels (flood fill at scale) |
| **Games** | Instantly checking board connectivity (e.g., Hex, percolation puzzles) |
| **Version control** | Detecting merge groups / tracking which commits share ancestry |

The deeper idea: **some questions don't need a full traversal if you're willing to remember a little more structure as you go.**

---

## Solution

### The Naive Idea

Give every element a "group label." To union two groups, relabel every element in one group to match the other. Relabeling touches up to `n` elements — slow if you do it often.

### The Optimized Idea: Point to a Parent, Not a Label

Instead of a group label, each element points to a **parent**. A group is a tree, and the **root** of the tree is the group's identity.

- `find(x)` — climb parent pointers until you hit a root.
- `union(a, b)` — find both roots, then attach one root under the other.

Two tricks make this nearly O(1):

1. **Union by rank/size** — always attach the smaller tree under the bigger one, so trees stay shallow instead of turning into long chains.
2. **Path compression** — while climbing to find the root, rewire every node along the way to point *directly* at the root. Next time, the climb is instant.

Together, these bring the amortized cost per operation down to **O(α(n))** — the inverse Ackermann function, which is smaller than 5 for any input size you'll ever encounter in practice. Effectively constant time.

### Step-by-Step Walkthrough

```
find(3) on tree: 3 → 1 → 0 (root)

Before compression:  3 → 1 → 0
After compression:   3 → 0   (and 1 → 0)

Next find(3) is now a single hop.
```

Every `find()` call flattens the path a little more. The structure gets faster the more you use it.

---

## Code

### Python

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        # Path compression: point every node directly at the root
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
    uf.union(2, 3)
    uf.union(1, 3)

    print(uf.connected(0, 2))  # True
    print(uf.connected(0, 4))  # False

    uf.union(4, 5)
    print(uf.connected(4, 5))  # True
```

### JavaScript

```javascript
class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        // Path compression: point every node directly at the root
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
uf.union(2, 3);
uf.union(1, 3);

console.log(uf.connected(0, 2)); // true
console.log(uf.connected(0, 4)); // false

uf.union(4, 5);
console.log(uf.connected(4, 5)); // true
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(α(n)) amortized per operation | Union by rank keeps trees shallow; path compression flattens them further with every call |
| **Space** | O(n) | One parent slot and one rank slot per element |

Without the two optimizations, a chain of unions could degrade `find()` to O(n) — a linked list in disguise. With both, millions of operations run in what is, for all practical purposes, constant time.

---

## One Minute Insight

> **Flattening the path today saves everyone a walk tomorrow.** Union-Find doesn't answer "are we connected?" by searching — it answers by remembering, a little more precisely, every single time it's asked. The lazy shortcut you leave behind is the optimization the next query gets for free.

*Run `code.py` or `code.js` to see it in action.*
