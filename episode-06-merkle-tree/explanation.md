# The Tree That Lets You Trust Strangers

A hash tells you "this file is unchanged." A **Merkle tree** tells you "this *one block*, out of a billion, is unchanged" — without touching the other 999,999,999.

---

## The Problem

Imagine you download a 10GB file split into a million chunks from a peer you don't trust. One chunk arrives corrupted. How do you find *which one*, without re-downloading and re-hashing all 10GB?

Hashing the whole file only tells you pass/fail for everything. You need a structure where **verifying one piece costs O(log n)**, not O(n).

This is exactly the problem Git, BitTorrent, and Bitcoin solve with a **Merkle tree**: a binary tree where every leaf is the hash of a data block, and every parent is the hash of its children's hashes combined. The root — a single hash — represents the *entire dataset*. Change one byte anywhere, and the root changes too.

---

## Example

```
Data blocks: ["block_A", "block_B", "block_C", "block_D"]

Leaves:    H(A)   H(B)   H(C)   H(D)
              \    /        \    /
Level 1:    H(HA+HB)      H(HC+HD)
                  \           /
Root:           H(H1 + H2)

Root hash: 7e3a9f... (one string represents all 4 blocks)
```

To prove `block_B` is untampered, you don't need `block_A`, `C`, or `D` — just **two sibling hashes**: `H(A)` and `H(HC+HD)`. Combine them with `H(B)` step by step, and if you land on the published root, `block_B` is verified.

---

## Why It Matters

| Domain | Use Case |
| :--- | :--- |
| **Version control** | Git's object store — every commit's hash depends on every file inside it |
| **Distributed systems** | BitTorrent verifies each downloaded piece independently |
| **Databases** | Cassandra/DynamoDB use Merkle trees to find data divergence between replicas without full table scans |
| **Cybersecurity** | Certificate Transparency logs use them for tamper-evident audit trails |
| **Blockchain** | Bitcoin/Ethereum store transactions in a Merkle tree so light clients can verify one transaction without the full block |

The pattern: **summarize big data into a small fingerprint, then drill down only where needed.**

---

## Solution

### The Key Insight: Hashing is Composable

`H(A + B)` changes if *either* `A` or `B` changes. Chain that property up a binary tree, and the root becomes a fingerprint of everything below it — but each node only depends on its two children, so verification only needs the **path from leaf to root**, not the whole tree.

### Step-by-Step Walkthrough

1. **Hash every block** → these become the leaves.
2. **Pair up adjacent hashes** and hash the concatenation → next level up. (If odd count, duplicate the last node.)
3. **Repeat** until one hash remains → the **root**.
4. **To prove a leaf is valid**: collect the sibling hash at each level on the way to the root (the "Merkle proof").
5. **To verify**: recompute hashes up the proof path. If the final result equals the published root, the data is authentic.

```
Verify block_B with proof [H(A), H(HC+HD)]:

step 1: combine H(B) with H(A)        → H(HA+HB)
step 2: combine result with H(HC+HD) → candidate_root

if candidate_root == published_root: ✓ verified
```

---

## Code

### Python

```python
import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Returns every level of the tree, leaves first, root last."""
    level = [sha256(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate odd one out

        next_level = []
        for i in range(0, len(level), 2):
            next_level.append(sha256(level[i] + level[i + 1]))

        tree.append(next_level)
        level = next_level

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        if index % 2 == 1:
            proof.append(("left", level[index - 1]))
        elif index + 1 < len(level):
            proof.append(("right", level[index + 1]))
        index //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    current = leaf_hash
    for side, sibling in proof:
        current = sha256(sibling + current) if side == "left" else sha256(current + sibling)
    return current == root


if __name__ == "__main__":
    blocks = ["block_A", "block_B", "block_C", "block_D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]

    print("Root:", root)

    # Prove block_B (index 1) is part of the dataset
    proof = get_proof(tree, 1)
    leaf_hash = sha256(blocks[1])

    print("Valid:", verify_proof(leaf_hash, proof, root))        # True

    # Tamper with the leaf -> proof should fail
    tampered_hash = sha256("block_B_HACKED")
    print("Tampered:", verify_proof(tampered_hash, proof, root))  # False
```

### JavaScript

```javascript
const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);

        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            nextLevel.push(sha256(level[i] + level[i + 1]));
        }

        tree.push(nextLevel);
        level = nextLevel;
    }

    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        if (index % 2 === 1) {
            proof.push(["left", level[index - 1]]);
        } else if (index + 1 < level.length) {
            proof.push(["right", level[index + 1]]);
        }
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let current = leafHash;
    for (const [side, sibling] of proof) {
        current = side === "left" ? sha256(sibling + current) : sha256(current + sibling);
    }
    return current === root;
}

const blocks = ["block_A", "block_B", "block_C", "block_D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];

console.log("Root:", root);

// Prove block_B (index 1) is part of the dataset
const proof = getProof(tree, 1);
const leafHash = sha256(blocks[1]);

console.log("Valid:", verifyProof(leafHash, proof, root));         // true

// Tamper with the leaf -> proof should fail
const tamperedHash = sha256("block_B_HACKED");
console.log("Tampered:", verifyProof(tamperedHash, proof, root));  // false
```

---

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| **Build tree** | O(n) | O(n) | Each level halves in size, summing to ~2n nodes total |
| **Generate proof** | O(log n) | O(log n) | One sibling per level, height = log₂(n) |
| **Verify proof** | O(log n) | O(1) | One hash combine per level |

Compare that to re-hashing the whole dataset (O(n)) every time you want to check a single block — the Merkle tree turns a linear problem into a logarithmic one.

---

## One Minute Insight

> **You don't need the whole truth to verify a piece of it — you just need a chain of hashes back to a number everyone agrees on.**

That's the entire trust model behind Git commits, blockchain blocks, and peer-to-peer file sharing: a tiny root hash acts as a tamper-evident seal over an arbitrarily large dataset, and a logarithmic proof lets anyone check one part without downloading the rest.

*Run `code.py` or `code.js` to see it in action.*
