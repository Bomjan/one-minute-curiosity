# The Tree Your Database Actually Uses

You've probably drawn a binary search tree in an interview. Your database never built one. Storage engines picked a wider, shorter shape decades ago, and the reason comes down to a single brutal fact: disk seeks are slow, and a binary tree wastes every one of them.

---

## The Problem

A balanced binary search tree over a billion keys has a height around `log2(1,000,000,000) ≈ 30`. That means a single lookup touches **30 nodes** — and if each node is a page pulled from disk, that's 30 slow disk seeks just to find one row.

Now imagine a tree where each node holds not 1 key, but 100. Suddenly the same billion keys only need `log100(1,000,000,000) ≈ 5` levels. Same data, one-sixth the disk trips.

**The challenge:** design a search tree that stays *wide and shallow* no matter how much data you throw at it, without ever needing to rebalance the whole thing from scratch.

This is exactly the problem the **B-Tree** was built to solve in 1970 (Bayer & McCreight), and it's still what powers the index behind almost every SQL query you've ever run.

---

## Example

```
Insert: 10, 20, 5, 6, 12, 30, 7, 17   (minimum degree t = 2, max 3 keys/node)

Final tree:
              [ 10, 20 ]
             /     |     \
      [5,6,7]   [12,17]  [30]

search(12)  -> one hop to the middle child, found on 1st key
search(99)  -> descends to the rightmost leaf, not found
```

Notice the tree never got taller than 2 levels, even after 2 node splits. Every leaf sits at the **exact same depth** — that's the invariant that keeps lookups predictable.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | MySQL's InnoDB, PostgreSQL, and SQLite all index rows with B-trees (or the B+tree variant) |
| **Filesystems** | NTFS and ext4 use B-tree-like structures to map filenames to disk blocks |
| **Key-value stores** | Many embedded stores (LMDB, BoltDB) use B-trees for their core page layout |
| **Systems design** | The general lesson — *match your data structure's shape to your storage medium's cost model* — applies to caches, network round-trips, and memory hierarchies too |

The deeper insight: a binary tree is optimized for a world where every comparison costs the same. Disks (and even RAM, thanks to cache lines) don't work that way — reading *one* extra key from a page you already fetched is nearly free, but fetching a *new* page is expensive. B-trees exploit that asymmetry directly.

---

## Solution

### The Key Insight: Trade Height for Width

Instead of 1 key per node, allow **many** keys per node — enough to fill one disk page. Two rules keep the tree balanced automatically:

1. **Every leaf lives at the same depth.** No rebalancing dance like in AVL/red-black trees — the tree only grows at the root.
2. **A node overflows, it splits.** When a node hits its maximum key count (`2t - 1` for minimum degree `t`), its middle key gets pushed up into the parent, and the node splits into two half-full children.

### Step-by-Step Walkthrough

```
t = 2 → each node holds at most 3 keys, at least 1 (except root)

Insert 10, 20, 5     → leaf: [5, 10, 20]
Insert 6              → leaf would hold 4 keys (overflow!)
                        Split: middle key 10 rises up
                        Root becomes [10], children [5,6] and [20]

Insert 12, 30, 7      → right child grows to [12,20,30] (fine)
                        left child grows to [5,6,7] (fine)

Insert 17             → right child [12,20,30] overflows on insert
                        Split: middle key 20 rises into root
                        Root becomes [10, 20]
                        Children: [5,6,7], [12,17], [30]
```

Each split is a **local, O(t) operation** — you never touch more than a couple of nodes, yet the whole tree stays perfectly balanced.

---

## Code

### Python

```python
class BTreeNode:
    def __init__(self, leaf=True):
        self.leaf = leaf
        self.keys = []
        self.children = []


class BTree:
    """Minimum degree t: every non-root node holds between t-1 and 2t-1 keys."""

    def __init__(self, t=2):
        self.t = t
        self.root = BTreeNode(leaf=True)

    def search(self, key, node=None):
        node = node or self.root
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if i < len(node.keys) and node.keys[i] == key:
            return True
        if node.leaf:
            return False
        return self.search(key, node.children[i])

    def insert(self, key):
        root = self.root
        if len(root.keys) == 2 * self.t - 1:
            new_root = BTreeNode(leaf=False)
            new_root.children.append(root)
            self._split_child(new_root, 0)
            self.root = new_root
        self._insert_non_full(self.root, key)

    def _split_child(self, parent, i):
        t = self.t
        child = parent.children[i]
        new_node = BTreeNode(leaf=child.leaf)

        mid_key = child.keys[t - 1]
        new_node.keys = child.keys[t:]
        child.keys = child.keys[:t - 1]

        if not child.leaf:
            new_node.children = child.children[t:]
            child.children = child.children[:t]

        parent.children.insert(i + 1, new_node)
        parent.keys.insert(i, mid_key)

    def _insert_non_full(self, node, key):
        i = len(node.keys) - 1
        if node.leaf:
            node.keys.append(None)
            while i >= 0 and key < node.keys[i]:
                node.keys[i + 1] = node.keys[i]
                i -= 1
            node.keys[i + 1] = key
        else:
            while i >= 0 and key < node.keys[i]:
                i -= 1
            i += 1
            if len(node.children[i].keys) == 2 * self.t - 1:
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key)


if __name__ == "__main__":
    tree = BTree(t=2)  # each node holds at most 3 keys before splitting
    for key in [10, 20, 5, 6, 12, 30, 7, 17]:
        tree.insert(key)

    print("Search 12:", tree.search(12))  # True
    print("Search 99:", tree.search(99))  # False
```

### JavaScript

```javascript
class BTreeNode {
    constructor(leaf = true) {
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
    }
}

class BTree {
    constructor(t = 2) {
        this.t = t;
        this.root = new BTreeNode(true);
    }

    search(key, node = this.root) {
        let i = 0;
        while (i < node.keys.length && key > node.keys[i]) i++;
        if (i < node.keys.length && node.keys[i] === key) return true;
        if (node.leaf) return false;
        return this.search(key, node.children[i]);
    }

    insert(key) {
        const t = this.t;
        const root = this.root;
        if (root.keys.length === 2 * t - 1) {
            const newRoot = new BTreeNode(false);
            newRoot.children.push(root);
            this._splitChild(newRoot, 0);
            this.root = newRoot;
        }
        this._insertNonFull(this.root, key);
    }

    _splitChild(parent, i) {
        const t = this.t;
        const child = parent.children[i];
        const newNode = new BTreeNode(child.leaf);

        const midKey = child.keys[t - 1];
        newNode.keys = child.keys.splice(t);
        child.keys.splice(t - 1);

        if (!child.leaf) {
            newNode.children = child.children.splice(t);
        }

        parent.children.splice(i + 1, 0, newNode);
        parent.keys.splice(i, 0, midKey);
    }

    _insertNonFull(node, key) {
        let i = node.keys.length - 1;
        if (node.leaf) {
            node.keys.push(null);
            while (i >= 0 && key < node.keys[i]) {
                node.keys[i + 1] = node.keys[i];
                i--;
            }
            node.keys[i + 1] = key;
        } else {
            while (i >= 0 && key < node.keys[i]) i--;
            i++;
            if (node.children[i].keys.length === 2 * this.t - 1) {
                this._splitChild(node, i);
                if (key > node.keys[i]) i++;
            }
            this._insertNonFull(node.children[i], key);
        }
    }
}

const tree = new BTree(2); // each node holds at most 3 keys before splitting
[10, 20, 5, 6, 12, 30, 7, 17].forEach((key) => tree.insert(key));

console.log("Search 12:", tree.search(12)); // true
console.log("Search 99:", tree.search(99)); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Search** | O(log_t n) | Height stays `~log_t(n)` since every node fans out to `t..2t` children |
| **Insert** | O(log_t n) | One descent to a leaf, with at most O(log_t n) splits bubbling upward |
| **Space** | O(n) | Every key is stored exactly once, split across wide nodes |

The constant hiding in `log_t` is the whole point: with `t = 100`, a billion keys need only ~5 levels instead of the ~30 a binary tree would need — a 6x cut in disk seeks for the same data.

---

## One Minute Insight

> **Design for where the cost actually is.** A binary tree assumes every comparison is equally expensive. Real storage isn't like that — reading one extra key from a page you already loaded is nearly free, but loading a *new* page is not. The B-tree just takes that asymmetry seriously.

Next time you reach for a "balanced tree," ask what's actually slow in your system: CPU cycles, network round-trips, or disk seeks. The answer changes the shape of the right data structure.

*Run `code.py` or `code.js` to see it in action.*
