# The Fingerprint of a Billion Files

Two servers hold a terabyte each and one byte differs. A Merkle tree finds it by comparing a handful of hashes instead of the whole terabyte.

---

## The Problem

Two replicas of a database should be identical, but a disk glitch flipped bits in one of them. Sending the whole dataset across the network to compare is far too slow.

Think of two copies of a 1,000-page book. Instead of reading both side by side, you ask: "Do the page-hash totals of the first half match? The second?" Then you keep halving, always into the half that disagrees.

**Goal:** find exactly which blocks differ, using as little communication as possible.

---

## Example

```
Replica A blocks: [b0 b1 b2 b3 b4 b5 b6 b7]
Replica B blocks: [b0 b1 b2 b3 b4 b5* b6 b7]   (* = corrupted)

Root(A) != Root(B)            -> something differs
Left half  hash: equal        -> skip 4 blocks
Right half hash: different    -> descend
  b4+b5 pair: different       -> descend
    b4: equal, b5: different  -> found it!

Output: [5]   (4 hash comparisons per replica, not 8 blocks)
```

---

## Why It Matters

Merkle trees quietly power a lot of modern infrastructure:

| Domain | Use |
| :--- | :--- |
| **Git** | Commits and trees are hash-linked, so unchanged folders are skipped instantly |
| **Bitcoin / Ethereum** | Prove a transaction is in a block with ~log n hashes |
| **Cassandra / DynamoDB** | Anti-entropy repair between replicas |
| **Certificate Transparency** | Auditable, append-only logs of TLS certificates |
| **BitTorrent / IPFS** | Verify downloaded chunks independently |

---

## Solution

### The Key Insight: Hash the Hashes

1. Hash every block. These are the **leaves**.
2. Hash each pair of neighbours together to get the parent level.
3. Repeat until one hash remains: the **root**.

The root is a fingerprint of everything. Change one bit anywhere and the root changes.

### Finding the Difference

```
            ROOT
          /      \
       H(0-3)    H(4-7)   <- differs
                 /    \
             H(4,5)  H(6,7)
             /   \
           h4    h5       <- h5 differs
```

Compare roots. If they match, you are done. If not, compare the children, and only descend into the ones that mismatch. With one bad block you walk a single root-to-leaf path: `log2(n)` levels.

Two details that matter in real systems:
- **Domain separation:** prefix leaves with `0x00` and inner nodes with `0x01`, so an attacker can't pass off an inner node as a leaf (a second-preimage trick).
- **Odd levels:** duplicate the last node so every node has a pair.

---

## Code

### Python

```python
import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(blocks):
    """Return levels[0] = leaf hashes ... levels[-1] = [root]."""
    level = [h(b"\x00" + b) for b in blocks]  # 0x00 prefix: leaf domain
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(b"\x01" + level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def diff(a, b):
    """Indices of blocks that differ, found by descending only into mismatches."""
    if a[-1] == b[-1]:
        return []
    suspects = [0]
    for depth in range(len(a) - 2, -1, -1):
        nxt = []
        for i in suspects:
            for child in (2 * i, 2 * i + 1):
                if child < len(a[depth]) and a[depth][child] != b[depth][child]:
                    nxt.append(child)
        suspects = nxt
    return suspects


if __name__ == "__main__":
    replica_a = [f"block-{i}".encode() for i in range(8)]
    replica_b = list(replica_a)
    replica_b[5] = b"block-5-CORRUPTED"

    ta, tb = build_tree(replica_a), build_tree(replica_b)
    print("Roots equal?", ta[-1] == tb[-1])  # False
    print("Differing blocks:", diff(ta, tb))  # [5]
    print("Identical replicas:", diff(ta, build_tree(replica_a)))  # []
```

### JavaScript

```javascript
const { createHash } = require("crypto");

const h = (...parts) => {
  const hash = createHash("sha256");
  parts.forEach((p) => hash.update(p));
  return hash.digest();
};

function buildTree(blocks) {
  // 0x00 prefix: leaf domain
  let level = blocks.map((b) => h(Buffer.from([0]), b));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // odd: duplicate last
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.from([1]), level[i], level[i + 1]));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

// Indices of differing blocks, found by descending only into mismatches.
function diff(a, b) {
  if (a.at(-1)[0].equals(b.at(-1)[0])) return [];
  let suspects = [0];
  for (let depth = a.length - 2; depth >= 0; depth--) {
    const next = [];
    for (const i of suspects) {
      for (const child of [2 * i, 2 * i + 1]) {
        if (child < a[depth].length && !a[depth][child].equals(b[depth][child])) {
          next.push(child);
        }
      }
    }
    suspects = next;
  }
  return suspects;
}

const replicaA = Array.from({ length: 8 }, (_, i) => Buffer.from(`block-${i}`));
const replicaB = [...replicaA];
replicaB[5] = Buffer.from("block-5-CORRUPTED");

const ta = buildTree(replicaA);
const tb = buildTree(replicaB);
console.log("Roots equal?", ta.at(-1)[0].equals(tb.at(-1)[0])); // false
console.log("Differing blocks:", diff(ta, tb)); // [ 5 ]
console.log("Identical replicas:", diff(ta, buildTree(replicaA))); // []
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) to build, O(k log n) to diff | Every block is hashed once; each of the k bad blocks costs one root-to-leaf walk |
| **Space** | O(n) | The tree holds about 2n hashes |

Over a network, finding one bad block among a million takes about 20 levels of hash exchange instead of a million blocks.

---

## One Minute Insight

> **Don't compare data. Compare summaries of summaries.** A hash tree turns "is everything the same?" into one question, and "what's different?" into a binary search.

Trust scales when verification is cheaper than the data it verifies.

*Run `code.py` or `code.js` to see it in action.*
