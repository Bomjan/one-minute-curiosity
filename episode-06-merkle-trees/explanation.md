# The Tree That Catches Liars

Git can tell you if a single byte changed in a million-file repository without re-reading every file. So can Bitcoin, IPFS, and every "verified" download you've ever trusted. The trick is a tree of hashes that fits in your pocket but fingerprints an entire universe of data.

---

## The Problem

You're downloading a huge file in thousands of chunks from a peer you don't fully trust — think BitTorrent, a CDN edge node, or a blockchain full node. You want to verify each chunk as it arrives, without:

1. **Waiting for the whole file** to hash it in one shot, or
2. **Trusting the sender blindly** and hoping no chunk was corrupted or maliciously swapped.

You only have one thing you're sure of: a single, short **root hash** you got from a trusted source beforehand.

**Your goal:** verify that any one chunk truly belongs to the original dataset, using only that root hash and a small amount of extra data — not the entire file.

---

## Example

```
Data:  ["chunk-A", "chunk-B", "chunk-C", "chunk-D", "chunk-E"]

                              ROOT
                             /    \
                         H01234   H01234 (dup)
                        /      \
                    H0123      H4-H4(dup)
                   /     \         \
                H01      H23       H44
               /   \    /   \       \
             H0    H1  H2    H3     H4
              |     |   |     |      |
              A     B   C     D      E

To prove "chunk-C" belongs to this set, you only need:
  hash(D), hash(H01), hash(H4-H4dup)   →  3 hashes, not 5 chunks.

Recompute upward: hash(C) → combine with H3 → combine with H01 → combine with H44
If the result equals ROOT, chunk-C is genuine. Change one letter in "chunk-C"
and the recomputed root will never match.
```

---

## Why It Matters

A Merkle tree turns "verify this huge blob of data" into "verify this one small hash," which shows up everywhere data integrity matters:

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies commits, trees, and blobs by content hash — a Merkle DAG |
| **Cybersecurity** | Certificate Transparency logs prove a TLS cert was publicly logged, tamper-evidently |
| **Blockchain** | Bitcoin blocks store a Merkle root so light clients verify one transaction without the whole chain |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for anti-entropy — finding out-of-sync replicas fast |
| **P2P networks** | BitTorrent and IPFS verify chunks independently, from any peer, in any order |

The deeper lesson: **you can compress "trust the whole dataset" into "trust one small root," and prove membership in logarithmic time.**

---

## Solution

### The Key Insight: Hash Pairs, Bubble Up

1. Hash every leaf (data chunk) individually.
2. Pair up adjacent hashes and hash the concatenation — that's the parent.
3. Repeat until only one hash remains: the **root**.

Because hashing is one-way and collision-resistant, changing any leaf cascades a different hash all the way to the root. The root becomes a tamper-evident fingerprint of *everything* beneath it.

### The Second Insight: You Don't Need the Whole Tree to Prove One Leaf

To prove leaf `C` is genuine, you don't need every other leaf — just the **sibling hash at each level** on the path from `C` to the root (its "Merkle proof"). That's `log₂(n)` hashes instead of `n` chunks.

### Step-by-Step Walkthrough

```
1. Hash each chunk:          H0, H1, H2, H3, H4
2. Pair and hash upward:     H01 = hash(H0+H1),  H23 = hash(H2+H3)
                              H4 has no partner → paired with itself → H44
3. Continue pairing:         H0123 = hash(H01+H23)
                              H01234 = hash(H0123+H44)  (only one node left → ROOT)
4. To verify C:
     - Recompute H2 from "chunk-C"
     - Combine with sibling H3  → get H23
     - Combine with sibling H01 → get H0123
     - Combine with sibling H44 → get ROOT
     - Compare against the trusted root hash
```

If any hash along that path doesn't match, the chunk (or the proof) has been tampered with — and you found out in `O(log n)` steps.

---

## Code

### Python

```python
import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    # Build every level of the tree, from raw leaf hashes up to the root.
    level = [sha256(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        # Odd node out gets paired with a copy of itself.
        padded = level + [level[-1]] if len(level) % 2 else level
        level = [sha256(padded[i] + padded[i + 1]) for i in range(0, len(padded), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    # Sibling hashes needed to rebuild the root from a single leaf.
    proof = []
    for level in tree[:-1]:
        sibling = min(index + 1 if index % 2 == 0 else index - 1, len(level) - 1)
        proof.append(level[sibling])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    current = sha256(leaf)
    for sibling in proof:
        current = sha256(current + sibling if index % 2 == 0 else sibling + current)
        index //= 2
    return current == root


chunks = ["chunk-A", "chunk-B", "chunk-C", "chunk-D", "chunk-E"]
tree = build_merkle_tree(chunks)
root = tree[-1][0]

proof = get_proof(tree, 2)
print(verify_proof("chunk-C", 2, proof, root))         # True
print(verify_proof("chunk-C-hacked", 2, proof, root))  # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        const padded = level.length % 2 ? [...level, level[level.length - 1]] : level;
        const next = [];
        for (let i = 0; i < padded.length; i += 2) {
            next.push(sha256(padded[i] + padded[i + 1]));
        }
        tree.push(next);
        level = next;
    }

    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        const sibling = Math.min(index % 2 === 0 ? index + 1 : index - 1, level.length - 1);
        proof.push(level[sibling]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    let current = sha256(leaf);
    for (const sibling of proof) {
        current = sha256(index % 2 === 0 ? current + sibling : sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const chunks = ["chunk-A", "chunk-B", "chunk-C", "chunk-D", "chunk-E"];
const tree = buildMerkleTree(chunks);
const root = tree[tree.length - 1][0];

const proof = getProof(tree, 2);
console.log(verifyProof("chunk-C", 2, proof, root));         // true
console.log(verifyProof("chunk-C-hacked", 2, proof, root));  // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (build tree)** | O(n) | Every chunk is hashed once, then pairs are hashed level by level — total work is linear |
| **Time (verify one leaf)** | O(log n) | The proof path has one hash per tree level, and the tree has `log₂(n)` levels |
| **Space (proof size)** | O(log n) | Only sibling hashes along one root-to-leaf path are needed, not the whole tree |
| **Space (full tree)** | O(n) | Every level combined stores roughly `2n` hashes total |

Compare this to hashing the entire file on every check: `O(n)` per verification. A Merkle proof turns that into `O(log n)` — for a billion chunks, that's roughly 30 hash comparisons instead of a billion.

---

## One Minute Insight

> **Hierarchical hashing turns "trust everything" into "trust one small number."** A single root hash summarizes an arbitrarily large dataset, and any tampering — anywhere, even one byte — breaks the chain of hashes back to that root.

This is why Git commits are content-addressed, why blockchains can have "light clients" that verify transactions without downloading the whole ledger, and why distributed databases can find out-of-sync data without comparing every row. The pattern generalizes far beyond files: whenever you need to verify a small piece of a large, untrusted whole, ask whether a Merkle tree can turn your `O(n)` problem into `O(log n)`.

*Run `code.py` or `code.js` to see it in action.*
