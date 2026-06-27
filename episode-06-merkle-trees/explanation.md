# The Tree That Catches Liars

Git can tell if a single byte changed across a million files in milliseconds. Bitcoin nodes can verify a transaction without downloading the entire blockchain. The trick behind both: a tree made entirely of hashes.

---

## The Problem

Imagine you and a friend each hold a copy of a 10,000-file dataset. You want to know: **are our copies identical?**

The naive way: send every file over and compare byte-by-byte. Slow, and wasteful if only one file differs.

A smarter way: hash each file, then hash pairs of hashes together, repeatedly, until you're left with a single hash — the **Merkle root**. If your roots match, your entire datasets match. If they don't, you can binary-search down the tree to find the *exact* file that differs, touching only `O(log n)` nodes instead of all `n`.

---

## Example

```
Leaves (file hashes):     H(A)  H(B)  H(C)  H(D)
                            \    /      \    /
Level 1:                  H(AB)        H(CD)
                              \          /
Root:                       H(AB + CD)
```

If file `B` changes, only `H(B)`, `H(AB)`, and the root change. `H(C)`, `H(D)`, and `H(CD)` stay exactly the same — pointing you straight at the culprit without rehashing everything.

```
Compare roots: "9f3a..." vs "9f3a..." → identical datasets, 0 files transferred.
Compare roots: "9f3a..." vs "7be2..." → mismatch, walk down to find file B.
```

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git's object store is a Merkle DAG — `git diff` is fast because unchanged subtrees keep their hash |
| **Blockchain** | Each block stores a Merkle root of its transactions; light clients verify a single transaction with a tiny **Merkle proof**, not the whole block |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for **anti-entropy** — finding inconsistencies between replicas without full scans |
| **P2P file sharing** | BitTorrent verifies chunks against a known root hash before trusting data from strangers |
| **Certificate Transparency** | Browsers verify a certificate was logged publicly using a Merkle audit proof |

The pattern: **detect a difference in O(log n) instead of O(n), and prove a single fact without revealing everything else.**

---

## Solution

### Building the Tree

1. Hash every leaf (file, transaction, record).
2. Pair adjacent hashes and hash them together to form the next level.
3. If a level has an odd node out, pair it with itself (a common convention).
4. Repeat until one hash remains: the **root**.

### Proving Membership Without the Whole Tree

To prove leaf `B` is part of the dataset, you don't send the tree — you send the **sibling hash at each level** on the path to the root (the "Merkle proof"). The verifier recomputes the root using just those `O(log n)` hashes and checks it matches the known root.

```
Prove B is in the tree:
  proof = [H(A), H(CD)]
  verify: H( H(H(B) + H(A)) + H(CD) ) == known_root
```

---

## Code

### Python

```python
import hashlib


def sha(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, leaves first, root last."""
    level = [sha(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate the odd one out

        next_level = [sha(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(next_level)
        level = next_level

    return tree


def merkle_root(leaves):
    return build_merkle_tree(leaves)[-1][0]


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        sibling = index ^ 1  # flip last bit to find the pair
        if sibling < len(level):
            proof.append(level[sibling])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    current = sha(leaf)
    for sibling in proof:
        current = sha(current + sibling) if index % 2 == 0 else sha(sibling + current)
        index //= 2
    return current == root


if __name__ == "__main__":
    files = ["A", "B", "C", "D"]
    tree = build_merkle_tree(files)
    root = tree[-1][0]
    print(f"Root: {root}")

    proof = get_proof(tree, 1)  # prove "B" belongs
    print(f"B is valid: {verify_proof('B', 1, proof, root)}")
    print(f"Forged 'X' is valid: {verify_proof('X', 1, proof, root)}")
```

### JavaScript

```javascript
const crypto = require("crypto");

const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(leaves) {
    let level = leaves.map(sha);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);

        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            nextLevel.push(sha(level[i] + level[i + 1]));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }
    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let level = 0; level < tree.length - 1; level++) {
        const sibling = index ^ 1;
        if (sibling < tree[level].length) proof.push(tree[level][sibling]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    let current = sha(leaf);
    for (const sibling of proof) {
        current = index % 2 === 0 ? sha(current + sibling) : sha(sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const files = ["A", "B", "C", "D"];
const tree = buildMerkleTree(files);
const root = tree[tree.length - 1][0];
console.log(`Root: ${root}`);

const proof = getProof(tree, 1); // prove "B" belongs
console.log(`B is valid: ${verifyProof("B", 1, proof, root)}`);
console.log(`Forged 'X' is valid: ${verifyProof("X", 1, proof, root)}`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build Time** | O(n) | Each leaf and intermediate node is hashed exactly once |
| **Proof Size / Verify Time** | O(log n) | Only one sibling hash per level on the path to the root |
| **Space** | O(n) | The full tree stores every level, though only the root needs to be kept long-term |

A full byte-for-byte comparison of `n` files costs `O(n)`. A Merkle proof lets you verify **one fact about one file** in `O(log n)` — without ever seeing the other files.

---

## One Minute Insight

> **You don't need the whole truth to verify a fact — you need a chain of hashes pointing to it.** Merkle trees turn "trust the whole dataset" into "trust a handful of hashes," which is exactly why Git, Bitcoin, and every gossiping database cluster runs on this idea.

A single bit flip anywhere in the data changes the root completely, yet proving any one leaf belongs costs only `log₂(n)` hashes. That asymmetry — cheap to verify, expensive to forge — is the whole reason cryptographic hash trees became the backbone of trustless systems.

*Run `code.py` or `code.js` to see it in action.*
