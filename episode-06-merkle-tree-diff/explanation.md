# Spot the Corrupted Block Without Reading Everything

Two servers hold a million blocks each. One bit rotted somewhere. How do you find it by comparing only a handful of hashes? Meet the Merkle tree.

---

## The Problem

Two replicas of a database (or two copies of a big file) should be identical, but one block silently changed. Sending every block across the network to compare is painfully expensive.

Think of two huge books that must match. Instead of reading both cover to cover, you compare a single "fingerprint" per chapter, then per page, then per line, and only keep digging where fingerprints disagree.

**Goal:** Find every differing block while exchanging as little data as possible.

---

## Example

```
Replica A: block-0 ... block-999
Replica B: same, except block 42 = "corrupted!" and block 777 = "bit rot"

Compare roots   -> differ, so something is wrong
Descend only into mismatching children ... ~10 levels deep
Output: [42, 777]
```

For 1,000 blocks and 2 bad ones, you inspect roughly `2 x 10` hash pairs instead of 1,000 blocks.

---

## Why It Matters

| Domain | Where Merkle trees show up |
| :--- | :--- |
| **Distributed databases** | Cassandra and DynamoDB-style anti-entropy repair between replicas |
| **Version control** | Git's object model: a commit hash covers the entire tree beneath it |
| **Blockchains** | Prove a transaction is in a block with `log n` hashes |
| **Cybersecurity** | Tamper-evident logs and Certificate Transparency |
| **File sync / P2P** | BitTorrent v2 verifies pieces independently |

---

## Solution

### The Key Insight: A Hash of Hashes

1. Hash every block (the leaves).
2. Hash neighbouring pairs together to make the parent level.
3. Repeat until one hash remains: the **root**.

Change any single block and its hash changes, which changes its parent, and so on, all the way up. Equal roots mean equal data (up to hash collisions, which SHA-256 makes negligible).

### Finding the Difference

```
          root  (differs!)
         /    \
      L (differs)  R (same)  <- skip R entirely
      /  \
   LL     LR (differs)
   ...
```

At each level, only follow children whose hashes mismatch. Matching subtrees are provably identical, so you never open them.

---

## Code

### Python

```python
import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(blocks):
    """Return levels of hashes: levels[0] = leaves, levels[-1] = [root]."""
    level = [h(b) for b in blocks]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: promote the last hash by duplicating it
            level = level + [level[-1]]
        level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def find_diffs(a, b):
    """Return indices of leaves that differ, descending only into mismatching subtrees."""
    if a[-1][0] == b[-1][0]:
        return []  # roots match: replicas are identical

    suspects = [0]  # node indices at the current level
    for depth in range(len(a) - 1, 0, -1):
        children = []
        for i in suspects:
            for c in (2 * i, 2 * i + 1):
                if c < len(a[depth - 1]) and a[depth - 1][c] != b[depth - 1][c]:
                    children.append(c)
        suspects = children
    return suspects


if __name__ == "__main__":
    n = 1000
    replica_a = [f"block-{i}".encode() for i in range(n)]
    replica_b = list(replica_a)
    replica_b[42] = b"corrupted!"
    replica_b[777] = b"bit rot"

    tree_a, tree_b = build_tree(replica_a), build_tree(replica_b)
    print(find_diffs(tree_a, tree_b))  # [42, 777]
```

### JavaScript

```javascript
const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildTree(blocks) {
  // levels[0] = leaves, levels[last] = [root]
  let level = blocks.map((b) => h(b));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // duplicate odd tail
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.concat([level[i], level[i + 1]])));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

// Indices of differing leaves, descending only into mismatching subtrees.
function findDiffs(a, b) {
  if (a.at(-1)[0].equals(b.at(-1)[0])) return []; // roots match: identical

  let suspects = [0];
  for (let depth = a.length - 1; depth > 0; depth--) {
    const children = [];
    for (const i of suspects) {
      for (const c of [2 * i, 2 * i + 1]) {
        if (c < a[depth - 1].length && !a[depth - 1][c].equals(b[depth - 1][c])) {
          children.push(c);
        }
      }
    }
    suspects = children;
  }
  return suspects;
}

const replicaA = Array.from({ length: 1000 }, (_, i) => `block-${i}`);
const replicaB = [...replicaA];
replicaB[42] = "corrupted!";
replicaB[777] = "bit rot";

console.log(findDiffs(buildTree(replicaA), buildTree(replicaB))); // [ 42, 777 ]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) to build, O(k log n) to locate `k` differences | Building hashes every block once; diffing walks one root-to-leaf path per bad block |
| **Space** | O(n) | The tree holds about `2n` hashes |

---

## One Minute Insight

> **Don't compare the data, compare its fingerprint, then recurse only where the fingerprints disagree.**

A Merkle tree turns "are these million things equal?" into a logarithmic search. Whenever you can summarise a set with a hash that composes, you can verify, sync, and audit at a fraction of the cost.

*Run `code.py` or `code.js` to see it in action.*
