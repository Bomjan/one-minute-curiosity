# The Tree That Catches Liars

Git, Bitcoin, and Amazon's DynamoDB all share a secret weapon: a tree of hashes that can prove two giant datasets are identical — or pinpoint the exact byte that differs — without ever comparing the data directly.

---

## The Problem

You have two copies of a 10GB file (or a database, or a folder of a million files) sitting on different machines. You need to answer one question: **are they identical?**

The naive approach — download both, compare byte by byte — is slow and wastes bandwidth. Hashing the whole thing (`sha256(file)`) tells you *if* they differ, but not *where*. If only 1 file out of a million changed, you don't want to re-sync all million.

**Your goal:** Detect mismatches *and* locate them, in O(log n) comparisons instead of O(n).

---

## Example

```
Dataset A: [block1, block2, block3, block4]
Dataset B: [block1, block2, block3*, block4]   ← block3 was modified

Naive diff: compare all 4 blocks → 4 comparisons

Merkle tree diff:
        rootA vs rootB        → MISMATCH (1 comparison)
       /            \
  hash(1+2)      hash(3+4)    → left OK, right MISMATCH (2 comparisons)
                 /      \
            hash(3)   hash(4) → block3 differs! (2 comparisons)

Total: only 4 hash comparisons to pinpoint the exact differing block,
even with millions of blocks the cost grows as log(n), not n.
```

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git uses Merkle trees (commit → tree → blob) to detect which files changed between commits instantly |
| **Blockchain** | Bitcoin/Ethereum store transactions in a Merkle tree so light clients can verify one transaction without downloading the whole block |
| **Distributed databases** | DynamoDB and Cassandra use Merkle trees for anti-entropy — syncing replicas by comparing tree hashes, not full datasets |
| **CDNs & P2P** | BitTorrent verifies downloaded chunks against a Merkle root before trusting peers |
| **Cybersecurity** | Tamper detection — flipping a single bit anywhere changes the root hash, making forgery detectable |

The core idea: **hash combination turns "compare everything" into "compare a few summaries."**

---

## Solution

### The Key Insight: Hash Trees Summarize Recursively

1. Split data into blocks (leaves).
2. Hash each leaf.
3. Pair up leaf hashes, concatenate, and hash again to get parent nodes.
4. Repeat until you reach a single **root hash**.

If two trees have the same root hash, the underlying data is *provably* identical (barring hash collisions). If roots differ, walk down: whichever child hash differs tells you which half of the data changed. Recurse until you reach the single mismatched leaf.

### Step-by-Step Walkthrough

```
Leaves:  [A, B, C, D]
Level 1: H(A), H(B), H(C), H(D)
Level 2: H(H(A)+H(B)),  H(H(C)+H(D))
Root:    H( Level2[0] + Level2[1] )

To find a diff between Tree1 and Tree2:
  compare roots → differ → compare the two Level-2 hashes
  → one matches, one doesn't → descend into the mismatched branch
  → compare its two leaf hashes → found the exact differing leaf
```

Each level of comparison halves the search space — classic binary search, but over hashes instead of sorted values.

---

## Code

### Python

```python
import hashlib


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks: list[bytes]) -> list[list[str]]:
    """Builds all levels of the tree, from leaves up to the root."""
    level = [sha256(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate odd leaf
            next_level.append(sha256((left + right).encode()))
        tree.append(next_level)
        level = next_level

    return tree


def merkle_root(blocks: list[bytes]) -> str:
    return build_merkle_tree(blocks)[-1][0]


if __name__ == "__main__":
    data_a = [b"block1", b"block2", b"block3", b"block4"]
    data_b = [b"block1", b"block2", b"block3-modified", b"block4"]

    root_a = merkle_root(data_a)
    root_b = merkle_root(data_b)

    print("Root A:", root_a)
    print("Root B:", root_b)
    print("Identical:", root_a == root_b)  # False — one block changed
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1] ?? left; // duplicate odd leaf
            nextLevel.push(sha256(left + right));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }

    return tree;
}

function merkleRoot(blocks) {
    const tree = buildMerkleTree(blocks);
    return tree[tree.length - 1][0];
}

const dataA = ["block1", "block2", "block3", "block4"];
const dataB = ["block1", "block2", "block3-modified", "block4"];

const rootA = merkleRoot(dataA);
const rootB = merkleRoot(dataB);

console.log("Root A:", rootA);
console.log("Root B:", rootB);
console.log("Identical:", rootA === rootB); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build Time** | O(n) | Every block is hashed once, then pairs are hashed up the tree (total work is still linear) |
| **Diff/Verify Time** | O(log n) | Each comparison halves the search space — descend one level per step |
| **Space** | O(n) | Storing all levels of the tree; O(log n) if you only keep the root and a verification path |

Compare that to brute-force diffing, which costs O(n) *per comparison* — Merkle trees turn repeated full-data comparisons into a handful of hash checks.

---

## One Minute Insight

> **You don't need to see the data to trust it — you just need to trust the hash of the hash.** Merkle trees compress "are these equal?" from a data-sized question into a logarithmic one, which is precisely why they power Git diffs, blockchain verification, and database replica repair at planetary scale.

The same recursive idea — summarize, compare summaries, only descend where they disagree — is the blueprint for almost every efficient verification system in distributed computing.

*Run `code.py` or `code.js` to see it in action.*
