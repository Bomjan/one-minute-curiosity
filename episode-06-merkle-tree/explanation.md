# One Hash to Rule Them All

Git can tell you one byte changed in a million-line repo. Blockchains let a phone verify a transaction without downloading the ledger. Neither compares data directly — they compare a single number that summarizes everything underneath it.

---

## The Problem

Say you have two copies of a huge dataset — a 10GB file, a million database rows, a giant folder synced across two servers — and you need to know: **are they identical?**

Comparing byte-by-byte works, but it's slow and wasteful, especially over a network. Hashing the whole thing into one value is faster, but if the hashes don't match, you're stuck: *which* piece is different? You're back to scanning everything.

**The goal:** verify huge amounts of data with a tiny fingerprint, *and* pinpoint exactly what changed — without re-checking it all.

---

## Example

Split data into 4 blocks and hash them into a tree, pairing hashes upward until one hash remains: the **root**.

```
Data:     [A]      [B]      [C]      [D]
           |        |        |        |
Leaves:  H(A)     H(B)     H(C)     H(D)
           \      /          \      /
Level 1: H(H(A)+H(B))    H(H(C)+H(D))
                  \          /
Root:        H( H(H(A)+H(B)) + H(H(C)+H(D)) )
```

Now change a single character in block `C`. Its hash flips, which flips its parent's hash, which flips the **root**. Two datasets with the same root hash are provably identical — no exceptions, no false positives (short of a hash collision).

Even better: to prove block `B` is unmodified, you don't need the whole tree — just the 2 sibling hashes on its path to the root (`H(A)` and the right-side subtree hash). Recompute upward, compare to the known root. That's a **Merkle proof**.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies every commit, tree, and blob by hash — a Merkle DAG. One changed line changes the commit hash. |
| **Blockchain** | Block headers store only the Merkle root of all transactions, letting light clients verify one transaction in O(log n) without the full chain. |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for anti-entropy — comparing replicas without shipping the entire dataset across the network. |
| **P2P file transfer** | BitTorrent and IPFS verify each downloaded chunk against a root hash, catching corruption or tampering mid-download. |
| **Cybersecurity** | Certificate Transparency logs use Merkle trees so anyone can audit that a log wasn't secretly rewritten. |

The pattern underneath all of it: **push verification cost from O(n) down to O(log n) by hashing hierarchically instead of flatly.**

---

## Solution

### The Key Insight: Hash Recursively, Not Flatly

1. Hash every data block → **leaf hashes**.
2. Pair adjacent hashes, concatenate, hash again → **parent hashes**. (Duplicate the last node if the level has an odd count.)
3. Repeat until one hash remains → the **root**.

A single bit flip anywhere in the data cascades upward and changes the root — the tree is *tamper-evident* by construction.

### Proving One Leaf Without the Whole Tree

To prove block `i` is untouched, walk from the leaf to the root, collecting the **sibling hash** at each level (not the whole subtree — just one hash per level). That's the **Merkle proof**: `O(log n)` hashes instead of `O(n)` data.

The verifier re-hashes the claimed leaf with each sibling, level by level, and checks the result equals the known root.

```
Proof for B: [ H(A) (left sibling), H(H(C)+H(D)) (right sibling) ]

Verify:
  step 1: H( H(A) + H(B) )              → matches level-1 node
  step 2: H( step1 + H(H(C)+H(D)) )     → matches ROOT ✓
```

---

## Code

### Python

```python
import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Returns (root_hash, levels) — levels[0] is leaf hashes, levels[-1] is [root]."""
    level = [_hash(b) for b in blocks]
    levels = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate last node if odd count
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)

    return level[0], levels


def get_merkle_proof(levels, index):
    """Sibling hashes from leaf `index` up to the root."""
    proof = []
    for level in levels[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        sibling_index = index ^ 1  # flips the last bit -> the paired sibling
        side = "left" if sibling_index < index else "right"
        proof.append((level[sibling_index], side))
        index //= 2
    return proof


def verify_merkle_proof(leaf_data, proof, root):
    current = _hash(leaf_data)
    for sibling_hash, side in proof:
        current = _hash(sibling_hash + current) if side == "left" else _hash(current + sibling_hash)
    return current == root


if __name__ == "__main__":
    blocks = ["block A", "block B", "block C", "block D"]
    root, levels = build_merkle_tree(blocks)
    print("Root:", root)

    # Prove block B (index 1) is untouched, without the rest of the data
    proof = get_merkle_proof(levels, 1)
    print("Valid proof for B:", verify_merkle_proof("block B", proof, root))       # True
    print("Tampered data rejected:", verify_merkle_proof("block X", proof, root))  # False

    # Change one block -> root changes completely
    tampered_root, _ = build_merkle_tree(["block A", "block B", "block C!", "block D"])
    print("Original root == tampered root:", root == tampered_root)  # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(hash);
    const levels = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) next.push(hash(level[i] + level[i + 1]));
        levels.push(next);
        level = next;
    }

    return { root: level[0], levels };
}

function getMerkleProof(levels, index) {
    const proof = [];
    for (let d = 0; d < levels.length - 1; d++) {
        let level = levels[d];
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const siblingIndex = index ^ 1;
        proof.push({ hash: level[siblingIndex], side: siblingIndex < index ? "left" : "right" });
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyMerkleProof(leafData, proof, root) {
    let current = hash(leafData);
    for (const { hash: siblingHash, side } of proof) {
        current = side === "left" ? hash(siblingHash + current) : hash(current + siblingHash);
    }
    return current === root;
}

const blocks = ["block A", "block B", "block C", "block D"];
const { root, levels } = buildMerkleTree(blocks);
console.log("Root:", root);

const proof = getMerkleProof(levels, 1);
console.log("Valid proof for B:", verifyMerkleProof("block B", proof, root));       // true
console.log("Tampered data rejected:", verifyMerkleProof("block X", proof, root));  // false

const { root: tamperedRoot } = buildMerkleTree(["block A", "block B", "block C!", "block D"]);
console.log("Original root === tampered root:", root === tamperedRoot);  // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build time** | O(n) | Every block is hashed once, and each level halves in size |
| **Build space** | O(n) | All levels together store roughly `2n` hashes |
| **Proof size / verify time** | O(log n) | One sibling hash per level, from leaf to root |

Compare that to naive verification: sending or re-hashing all `n` blocks to check one of them. A Merkle proof turns that into a handful of hashes — for a billion-row dataset, about 30.

---

## One Minute Insight

> **Hierarchy turns "check everything" into "check one path."** A flat hash tells you *if* something changed; a Merkle tree tells you *if* and *where*, in logarithmic time, with logarithmic proof — which is exactly why Git, blockchains, and distributed databases all converge on the same trick.

The deeper idea: trust doesn't have to mean re-verifying raw data. Once you trust one small root hash, you can verify any single piece against it — the math carries the trust, so the data doesn't have to travel.

*Run `code.py` or `code.js` to see it in action.*
