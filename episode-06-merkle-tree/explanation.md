# The Tree That Catches a Single Flipped Bit

Git can tell you if one byte in a million-file repo changed. Bitcoin can prove a transaction happened without downloading the whole blockchain. Both tricks come from the same 40-year-old idea: stack hashes on top of hashes until the top one becomes a fingerprint for everything underneath.

---

## The Problem

You have a large dataset split into blocks — files in a repo, transactions in a block, chunks of a file being downloaded from a CDN. You want to answer two questions cheaply:

1. **Did anything change?** Comparing every byte of two million-block datasets is expensive.
2. **Does this one block really belong to the set?** Without re-downloading or re-hashing everything else.

Hashing the whole dataset into one blob answers question 1, but destroys question 2 — you'd have no way to prove a single block is legitimate without recomputing the giant hash from scratch.

**Your goal:** design a structure that detects a single-byte change instantly, *and* lets you prove any one block is part of the set in proportional-to-log(n) work, not proportional-to-n.

---

## Example

```
Blocks:  A    B    C    D

Leaves:  h(A) h(B) h(C) h(D)
           \   /      \   /
        h(hA+hB)   h(hC+hD)
              \        /
           h(h01 + h23)  ← Root

Change one byte in B →
  h(B) changes → h(hA+hB) changes → Root changes

Everything upstream of a changed leaf changes.
Everything else stays byte-for-byte identical.
```

To prove "B belongs to this tree" you only need **h(A)** and **h(h23)** — two hashes, not the whole dataset. Hash B, combine with its siblings up to the root, and check it matches.

---

## Why It Matters

This "hash tree" pattern — called a **Merkle tree** — quietly runs a huge share of the systems you use daily:

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git's commit graph is a Merkle DAG — one changed line changes the commit hash and every hash above it |
| **Databases** | Cassandra, DynamoDB, and Riak use Merkle trees for anti-entropy — comparing replicas by exchanging a handful of hashes instead of full datasets |
| **Blockchain** | Bitcoin and Ethereum store transactions in a Merkle tree so a light client can verify one transaction without the full chain |
| **Networking / CDNs** | BitTorrent and IPFS verify downloaded chunks against a root hash before trusting them |
| **Cybersecurity** | Certificate Transparency logs use Merkle trees so anyone can audit that a certificate was logged, without trusting the log operator |

The pattern generalizes past hashing: whenever you need to detect *that* something changed cheaply and prove *what* changed cheaply, stacking summaries in a tree beats scanning a list.

---

## Solution

### The Key Insight: Hash Pairs, Not the Whole Set

Instead of one hash over everything, hash each block individually, then repeatedly hash **pairs of hashes** together until one hash remains — the root.

- **Tamper detection is automatic.** Change one leaf, and every hash on the path to the root changes. The root becomes a fingerprint of the entire dataset.
- **Membership proofs are cheap.** To prove a leaf belongs, you don't need the other blocks — just the sibling hash at each level on the way up. That's `log2(n)` hashes, not `n`.

### Step-by-Step Walkthrough

```
Build (bottom-up):
  1. Hash each block          → the leaf level
  2. Hash adjacent pairs      → one level up (duplicate the last one if the count is odd)
  3. Repeat until one hash remains → the root

Prove block B (index 1) belongs:
  1. Grab B's sibling in the leaf level → h(A)
  2. Grab the parent's sibling one level up → h(h(C)+h(D))
  3. Recompute upward: h(A) + h(B) → h01; h01 + h23 → root
  4. If the recomputed root matches the real root, B is verified
```

Nobody needed to touch blocks A, C, or D to verify B. That's the whole trick.

---

## Code

### Python

```python
import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks):
    """Builds a Merkle tree bottom-up. levels[-1][0] is the root."""
    if not blocks:
        return [[_hash(b"")]]

    level = [_hash(b) for b in blocks]
    levels = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate on odd count
            next_level.append(_hash((left + right).encode()))
        levels.append(next_level)
        level = next_level

    return levels


def merkle_root(blocks):
    return build_merkle_tree(blocks)[-1][0]


def merkle_proof(levels, index):
    """Returns the sibling hashes (and their side) needed to rebuild the root from one leaf."""
    proof = []
    for level in levels[:-1]:
        if index % 2 == 0:
            sibling_index, direction = index + 1, "right"
        else:
            sibling_index, direction = index - 1, "left"
        sibling = level[sibling_index] if sibling_index < len(level) else level[index]
        proof.append((sibling, direction))
        index //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    current = leaf_hash
    for sibling, direction in proof:
        current = _hash((current + sibling).encode()) if direction == "right" else _hash((sibling + current).encode())
    return current == root


if __name__ == "__main__":
    blocks = [b"block-A", b"block-B", b"block-C", b"block-D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print("Root:", root)

    leaf_hash = _hash(blocks[1])
    proof = merkle_proof(tree, 1)
    print("Proof for block-B valid?", verify_proof(leaf_hash, proof, root))  # True

    tampered_hash = _hash(b"block-B-tampered")
    print("Tampered block valid?", verify_proof(tampered_hash, proof, root))  # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    if (blocks.length === 0) return [[sha256("")]];

    let level = blocks.map((b) => sha256(b));
    const levels = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate on odd count
            nextLevel.push(sha256(left + right));
        }
        levels.push(nextLevel);
        level = nextLevel;
    }

    return levels;
}

function merkleProof(levels, index) {
    const proof = [];
    for (let d = 0; d < levels.length - 1; d++) {
        const level = levels[d];
        let siblingIndex, direction;
        if (index % 2 === 0) {
            [siblingIndex, direction] = [index + 1, "right"];
        } else {
            [siblingIndex, direction] = [index - 1, "left"];
        }
        const sibling = siblingIndex < level.length ? level[siblingIndex] : level[index];
        proof.push([sibling, direction]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let current = leafHash;
    for (const [sibling, direction] of proof) {
        current = direction === "right" ? sha256(current + sibling) : sha256(sibling + current);
    }
    return current === root;
}

const blocks = ["block-A", "block-B", "block-C", "block-D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log("Root:", root);

const leafHash = sha256(blocks[1]);
const proof = merkleProof(tree, 1);
console.log("Proof for block-B valid?", verifyProof(leafHash, proof, root)); // true

const tamperedHash = sha256("block-B-tampered");
console.log("Tampered block valid?", verifyProof(tamperedHash, proof, root)); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build time** | O(n) | Every block is hashed once, and each level halves in size, so total work is n + n/2 + n/4 + ... ≈ 2n |
| **Build space** | O(n) | Storing every level costs roughly 2n hashes total |
| **Proof size / verify** | O(log n) | One sibling hash per level, and there are log2(n) levels |

Compare that to re-hashing the entire dataset to check one block: O(n) every single time. A Merkle tree pays a small upfront cost to turn every future check into O(log n).

---

## One Minute Insight

> **You don't need the whole picture to verify a piece of it — you need the path back to a trusted summary.**

A Merkle tree never asks "is this block correct in isolation?" It asks "does this block's path of ancestors agree with the one root everyone already trusts?" That's the same idea behind digital signatures, blockchain consensus, and even how your browser checks a certificate chain: trust one small anchor, verify everything else against it in log-time steps.

*Run `code.py` or `code.js` to see it in action.*
