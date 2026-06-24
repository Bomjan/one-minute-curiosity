# How Do Git and Bitcoin Spot One Changed Byte Instantly?

Imagine two copies of a 10GB file on opposite sides of the planet. You want to know — without downloading either — whether they're identical. Comparing byte by byte is out of the question. So how does Git tell you a file changed the moment you save it, and how does Bitcoin verify a transaction without downloading the entire blockchain?

---

## The Problem

You have a large dataset (a file, a folder, a list of transactions). You need to answer two questions cheaply:

1. **Did anything change?** (compare two versions without scanning everything)
2. **Can I prove one specific piece is part of the whole, without sending the whole thing?**

Hashing the entire blob gives you answer #1, but it's expensive to recompute on every tiny edit, and it gives you *zero* help with #2 — you'd have to send the entire dataset to prove a single item belongs to it.

**Goal:** Detect changes and prove membership, both in roughly **O(log n)** work.

---

## Example

```
Data blocks: [A, B, C, D]

Leaf hashes:    h(A)   h(B)   h(C)   h(D)
                  \     /       \     /
Level 1:        h(h(A)+h(B))  h(h(C)+h(D))
                       \           /
Root:              h(level1_left + level1_right)

Change D → D':
  - Only h(D), the level-1 right pair, and the root change.
  - h(A), h(B), and the entire left subtree stay untouched.
```

To prove "B is in this dataset" to someone who only has the **root hash**, you send just `h(A)` and `h(h(C)+h(D))` — two hashes, not four blocks. They recompute the path up to the root and check it matches.

---

## Why It Matters

This is the **Merkle Tree** — a binary tree of hashes — and it quietly powers a huge chunk of modern infrastructure:

| Domain | Use |
| :--- | :--- |
| **Git** | Every commit, tree, and blob is content-addressed by hash; a single changed file changes its blob hash, which cascades up to a new commit hash — instant diffing |
| **Blockchain** | Each block's transactions form a Merkle tree; light clients verify a transaction is in a block using a tiny **Merkle proof**, without downloading the chain |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for **anti-entropy** — syncing replicas by comparing tree hashes instead of full datasets |
| **CDNs / file sync** | Tools like rsync and IPFS detect which chunks changed without re-hashing everything |
| **Certificate Transparency** | Browsers verify a TLS certificate was publicly logged using a Merkle proof, not the entire log |

The core idea: **push verification cost from O(n) down to O(log n) by hashing hierarchically.**

---

## Solution

### The Key Insight: Hash Pairs, Then Hash the Hashes

1. Hash every leaf (data block) individually.
2. Pair up adjacent hashes and hash each pair to get the next level.
3. Repeat until one hash remains — the **root**.
4. The root is a fingerprint of *everything*: change one byte anywhere, and the root changes (thanks to hash avalanche effects).

### Why proofs are small

To prove a leaf belongs to the tree, you only need the **sibling hash at each level** on the path to the root — not the whole tree. That's `log₂(n)` hashes for `n` leaves. The verifier recomputes hashes bottom-up using your leaf + the siblings you provided, and checks the result equals the known root.

### Walkthrough

```
Leaves: A B C D
Want to prove B is in the tree, given root R.

Path for B:
  1. Combine h(A) + h(B) → node1   (need sibling h(A))
  2. Combine node1 + node_right    (need sibling node_right = h(h(C)+h(D)))
  3. Result should equal R

Proof size: 2 hashes, for a dataset of 4 — and only grows as log(n).
```

---

## Code

### Python

```python
import hashlib


def h(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, leaves first, root last."""
    level = [h(leaf.encode()) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate last node if odd count
        level = [h((level[i] + level[i + 1]).encode()) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        sibling_index = index ^ 1  # flip last bit to find sibling
        if sibling_index < len(level):
            proof.append(level[sibling_index])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    current = h(leaf.encode())
    for sibling in proof:
        # left sibling comes first if our index was odd, else we're on the left
        current = h((sibling + current).encode()) if index % 2 else h((current + sibling).encode())
        index //= 2
    return current == root


if __name__ == "__main__":
    data = ["A", "B", "C", "D"]
    tree = build_merkle_tree(data)
    root = tree[-1][0]

    proof = get_proof(tree, 1)  # prove "B" belongs
    print("Root:", root)
    print("Proof for B:", proof)
    print("Valid?", verify_proof("B", 1, proof, root))      # True
    print("Tampered?", verify_proof("X", 1, proof, root))   # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function h(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    let level = leaves.map(h);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(h(level[i] + level[i + 1]));
        }
        level = next;
        tree.push(level);
    }
    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        const siblingIndex = index ^ 1;
        if (siblingIndex < level.length) proof.push(level[siblingIndex]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    let current = h(leaf);
    for (const sibling of proof) {
        current = index % 2 ? h(sibling + current) : h(current + sibling);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const data = ["A", "B", "C", "D"];
const tree = buildMerkleTree(data);
const root = tree[tree.length - 1][0];

const proof = getProof(tree, 1); // prove "B" belongs
console.log("Root:", root);
console.log("Proof for B:", proof);
console.log("Valid?", verifyProof("B", 1, proof, root));     // true
console.log("Tampered?", verifyProof("X", 1, proof, root));  // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build tree** | O(n) | Every leaf and internal node is hashed once |
| **Generate / verify proof** | O(log n) | Proof length equals the tree height |
| **Space** | O(n) | All levels combined hold roughly 2n hashes |

Compare that to re-hashing or re-transmitting the entire dataset to detect a change or prove membership — that's O(n) every single time. Merkle trees turn a linear problem into a logarithmic one by exploiting hierarchy.

---

## One Minute Insight

> **A single hash can fingerprint an entire universe of data — if you build it hierarchically.** Hashing flat gives you a fingerprint with no structure: any change forces a full re-scan. Hashing as a tree gives you a fingerprint *and* a map — you can pinpoint exactly what changed, or prove a single fact about the whole, by touching only the path to the root.

The same trick that lets Git know your file changed before you even hit save is what lets a phone wallet trust a blockchain it has never fully downloaded.

*Run `code.py` or `code.js` to see it in action.*
