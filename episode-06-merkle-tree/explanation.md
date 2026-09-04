# The Tree That Catches a Single Flipped Bit

Two warehouses claim to hold identical inventories of a million boxes. You don't want to unpack every box to check — you want to point at *one* box and say "that one's wrong." A single clever tree of hashes makes that possible.

---

## The Problem

Two servers each hold a copy of the same large dataset — a database replica, a distributed cache, a peer in a blockchain network. You want to know: **are they identical?**

The naive move is to hash the whole dataset on each side and compare the two checksums. That tells you *whether* they differ, but not *where*. The moment one record is out of sync, you're stuck re-transferring or re-hashing the entire dataset just to find the one row that changed.

> Can you verify a dataset — and pinpoint exactly what changed — without touching most of it?

---

## Example

```
8 records, one of them silently corrupted on replica B:

Replica A: [r0, r1, r2, r3, r4, r5,        r6, r7]
Replica B: [r0, r1, r2, r3, r4, r5(edited), r6, r7]

Naive check:  hash(A) != hash(B)  → "something's different" (that's all you know)

Merkle check: root(A) != root(B) → walk down only the mismatched branch
              → arrive directly at leaf index 5

Result: 1 flipped record found by comparing 3 tree levels, not 8 records.
```

---

## Why It Matters

This one structure quietly runs a huge slice of modern infrastructure:

| System | How it uses a Merkle tree |
| :--- | :--- |
| **Git** | Every commit is a hash of its tree, which is a hash of its blobs — `git fetch` only transfers objects whose hash actually changed |
| **Bitcoin / blockchain** | The block header stores a Merkle root, so a light wallet can prove a transaction is in a block using a handful of hashes instead of the whole block |
| **Cassandra / DynamoDB** | Anti-entropy repair between replicas compares Merkle trees to find *which* key ranges diverged, not just *that* they did |
| **IPFS / Certificate Transparency** | Content is addressed and audited by hash trees so any tampering is detectable without downloading everything |

Anywhere two parties need to trust — or reconcile — a huge pile of data without shipping all of it, this is the trick underneath.

---

## Solution

### Build a tree of hashes, bottom-up

1. Hash every data block — these become the **leaves**.
2. Pair up adjacent hashes and hash the pair together — that's the next level up.
3. Repeat until one hash remains: the **root**. (If a level has an odd count, duplicate the last hash so it has a partner.)

The root is a single fingerprint: if *anything* underneath changes, the root changes too, because hashes cascade upward.

### Compare two trees without comparing all the data

Don't diff the leaves. Diff the **roots** first:

- Roots match → the datasets are identical (with the collision odds of the hash function).
- Roots differ → recurse into the two children *only where their hashes disagree*. Any subtree whose hash already matches is proven identical and gets skipped entirely.

Each mismatch halves the search space, so a single differing leaf out of `n` is found in `O(log n)` hash comparisons instead of `O(n)`.

### Prove one leaf belongs, without the rest of the data

A **Merkle proof** for a leaf is just the sibling hash at every level on the path up to the root — `O(log n)` hashes. Anyone holding the root can recompute it from the leaf plus that short proof and confirm the leaf is genuinely part of the tree, without ever seeing the other leaves.

---

## Code

### Python

```python
import hashlib


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class MerkleTree:
    def __init__(self, blocks):
        self.leaves = [sha(block) for block in blocks]
        self.levels = self._build(self.leaves)

    def _build(self, level):
        levels = [level]
        while len(level) > 1:
            parent = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left
                parent.append(sha((left + right).encode()))
            levels.append(parent)
            level = parent
        return levels

    @property
    def root(self):
        return self.levels[-1][0]

    def proof(self, index):
        path = []
        idx = index
        for level in self.levels[:-1]:
            sibling = idx ^ 1
            if sibling >= len(level):
                sibling = idx
            path.append((level[sibling], idx % 2))
            idx //= 2
        return path


def verify_proof(leaf_hash, proof, root):
    h = leaf_hash
    for sibling, position in proof:
        h = sha((sibling + h).encode()) if position == 1 else sha((h + sibling).encode())
    return h == root


def find_mismatches(tree_a, tree_b):
    if tree_a.root == tree_b.root:
        return []
    return _diff(tree_a.levels, tree_b.levels, len(tree_a.levels) - 1, 0)


def _diff(levels_a, levels_b, level, index):
    if levels_a[level][index] == levels_b[level][index]:
        return []
    if level == 0:
        return [index]
    left, right = 2 * index, 2 * index + 1
    found = _diff(levels_a, levels_b, level - 1, left)
    if right < len(levels_a[level - 1]):
        found += _diff(levels_a, levels_b, level - 1, right)
    return found


if __name__ == "__main__":
    records = [f"record-{i}:balance=100".encode() for i in range(8)]
    replica_a = MerkleTree(records)

    tampered = records.copy()
    tampered[5] = b"record-5:balance=999999"
    replica_b = MerkleTree(tampered)

    print("Identical?", replica_a.root == replica_b.root)
    print("Divergent leaf:", find_mismatches(replica_a, replica_b))

    p = replica_a.proof(3)
    print("Proof verifies:", verify_proof(replica_a.leaves[3], p, replica_a.root))
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class MerkleTree {
  constructor(blocks) {
    this.leaves = blocks.map(b => sha(b));
    this.levels = this._build(this.leaves);
  }

  _build(level) {
    const levels = [level];
    while (level.length > 1) {
      const parent = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        parent.push(sha(left + right));
      }
      levels.push(parent);
      level = parent;
    }
    return levels;
  }

  get root() {
    return this.levels[this.levels.length - 1][0];
  }

  proof(index) {
    const path = [];
    let idx = index;
    for (let l = 0; l < this.levels.length - 1; l++) {
      const level = this.levels[l];
      let sibling = idx ^ 1;
      if (sibling >= level.length) sibling = idx;
      path.push([level[sibling], idx % 2]);
      idx = Math.floor(idx / 2);
    }
    return path;
  }
}

function verifyProof(leafHash, proof, root) {
  let h = leafHash;
  for (const [sibling, position] of proof) {
    h = position === 1 ? sha(sibling + h) : sha(h + sibling);
  }
  return h === root;
}

function findMismatches(treeA, treeB) {
  if (treeA.root === treeB.root) return [];
  return diff(treeA.levels, treeB.levels, treeA.levels.length - 1, 0);
}

function diff(levelsA, levelsB, level, index) {
  if (levelsA[level][index] === levelsB[level][index]) return [];
  if (level === 0) return [index];
  const left = 2 * index;
  const right = 2 * index + 1;
  let found = diff(levelsA, levelsB, level - 1, left);
  if (right < levelsA[level - 1].length) {
    found = found.concat(diff(levelsA, levelsB, level - 1, right));
  }
  return found;
}

const records = Array.from({ length: 8 }, (_, i) => `record-${i}:balance=100`);
const replicaA = new MerkleTree(records);

const tampered = [...records];
tampered[5] = "record-5:balance=999999";
const replicaB = new MerkleTree(tampered);

console.log("Identical?", replicaA.root === replicaB.root);
console.log("Divergent leaf:", findMismatches(replicaA, replicaB));

const p = replicaA.proof(3);
console.log("Proof verifies:", verifyProof(replicaA.leaves[3], p, replicaA.root));
```

---

## Complexity

| Operation | Time | Space | Notes |
| :--- | :--- | :--- | :--- |
| **Build tree** | O(n) | O(n) | One hash per node, `n` leaves → ~2n total nodes |
| **Compare two trees** | O(log n) per difference | O(log n) recursion depth | Only mismatched branches are visited |
| **Generate/verify proof** | O(log n) | O(log n) | One sibling hash per level |

Compare that to the naive approach: finding a single differing record among `n` by brute force is `O(n)`. The tree turns "which record changed" into a binary search over hashes.

---

## One Minute Insight

> **Hashing tells you *that* something changed. A tree of hashes tells you *where*.**

The moment you stack hashes into a tree instead of computing one flat checksum, you get locality for free — a changed leaf only disturbs the hashes on its direct path to the root, leaving every sibling subtree untouched and verifiably unchanged. That's why Git can sync a repository by transferring only the objects that moved, why a light Bitcoin client can trust a single transaction without downloading the blockchain, and why a database can repair a replica by comparing a handful of hashes instead of every row.

*Run `code.py` or `code.js` to watch a single tampered record get found in three hash comparisons instead of eight.*
