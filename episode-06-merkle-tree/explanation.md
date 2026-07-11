# The Tree That Never Lies

Git, Bitcoin, and Amazon's DynamoDB all share a secret weapon: a data structure that lets you prove one file is untouched among a billion, without ever showing the other 999,999,999.

---

## The Problem

You download a 4GB file split into a million chunks from an untrusted peer. One chunk might be corrupted or tampered with. How do you verify **just that one chunk** is authentic — without re-downloading, re-hashing, or trusting the other 999,999 chunks?

Hashing the whole file works, but it's all-or-nothing: change one byte anywhere, and you have no idea *which* chunk broke. Checking chunks individually against a trusted list means storing a million hashes and shipping all of them to every client.

**The insight:** hash the data in pairs, then hash the hashes, again and again, until you're left with a single "root" hash. Now proving any one chunk is legitimate only requires `log₂(n)` sibling hashes — not the whole dataset.

This structure is called a **Merkle tree**, invented by Ralph Merkle in 1979, and it quietly runs half the internet's trust infrastructure.

---

## Example

```
Leaves:  A    B    C    D
          \  /      \  /
          H(AB)    H(CD)
              \      /
             H(H(AB)+H(CD))  ← Merkle Root
```

To prove **B** is untouched, you don't need A, C, or D — just:
- `H(A)` (B's sibling)
- `H(CD)` (the other branch)

Recompute: `H( H(A) + H(B) )` → combine with `H(CD)` → compare to the known **root**.
If it matches, B is provably authentic. That's it — **2 hashes instead of 4**, and the gap only widens as the dataset grows (20 hashes to verify 1 chunk out of a million).

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git's commit/tree/blob objects form a Merkle DAG — one commit hash fingerprints your entire repo history |
| **Blockchain** | Bitcoin blocks store a Merkle root of all transactions; light clients verify a payment without downloading the whole chain |
| **Distributed databases** | Cassandra & DynamoDB use Merkle trees for **anti-entropy** — comparing replicas and syncing only the branches that differ |
| **Cybersecurity** | Certificate Transparency logs use Merkle proofs so anyone can audit issued TLS certificates without trusting the log operator |
| **P2P networks** | BitTorrent and IPFS verify individual chunks of a file as they arrive, rejecting corrupted pieces instantly |

The deeper lesson: **you can compress trust into a single hash, then selectively unpack just enough of it to prove any one claim.**

---

## Solution

### The Key Insight: Build Up, Prove Down

**Building** the tree is simple: hash every leaf, pair up hashes, hash the pairs, repeat until one hash remains (the root). If a level has an odd number of nodes, duplicate the last one.

**Proving** membership works in reverse: starting from your leaf, walk up to the root, and at each level grab only the *sibling* hash you need to recompute the parent. That's your proof — a list of `log₂(n)` hashes plus their side (left/right).

**Verifying** replays the same combination steps a receiver can do independently: hash your leaf, fold in each sibling from the proof in order, and check the final result equals the trusted root.

### Step-by-Step Walkthrough

```
4 files: A, B, C, D → want to prove C is legit

1. Build tree:
   Level 0: H(A) H(B) H(C) H(D)
   Level 1: H(H(A)+H(B))   H(H(C)+H(D))
   Level 2: Root = H(Level1[0] + Level1[1])

2. Generate proof for C (index 2):
   - C is a "left" node at level 0 → sibling is H(D), side="right"
   - parent index 1 is "right" at level 1 → sibling is H(H(A)+H(B)), side="left"
   proof = [(H(D), "right"), (H(H(A)+H(B)), "left")]

3. Verify:
   current = H(C)
   current = H(current + H(D))         # combine right
   current = H(H(H(A)+H(B)) + current) # combine left
   current == Root?  ✓ → C is authentic
```

---

## Code

### Python

```python
import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, from leaf hashes up to the root."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate the odd one out
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_root(tree):
    return tree[-1][0]


def get_proof(tree, index):
    """Collects the sibling hash needed at each level to rebuild the root."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        is_right = index % 2 == 1
        sibling = level[index - 1] if is_right else level[index + 1]
        proof.append((sibling, "left" if is_right else "right"))
        index //= 2
    return proof


def verify_proof(leaf_data, proof, root):
    current = _hash(leaf_data)
    for sibling_hash, side in proof:
        current = _hash(sibling_hash + current) if side == "left" else _hash(current + sibling_hash)
    return current == root


if __name__ == "__main__":
    files = ["invoice_1.pdf", "invoice_2.pdf", "invoice_3.pdf", "invoice_4.pdf"]
    tree = build_merkle_tree(files)
    root = get_root(tree)

    print("Merkle Root:", root)

    proof = get_proof(tree, 2)  # prove invoice_3.pdf is authentic
    print("Valid file passes:", verify_proof(files[2], proof, root))
    print("Tampered file fails:", verify_proof("invoice_3_TAMPERED.pdf", proof, root))
```

### JavaScript

```javascript
const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(leaves) {
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(sha256(level[i] + level[i + 1]));
        }
        tree.push(next);
        level = next;
    }
    return tree;
}

const getRoot = (tree) => tree[tree.length - 1][0];

function getProof(tree, index) {
    const proof = [];
    for (let d = 0; d < tree.length - 1; d++) {
        let level = tree[d];
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const isRight = index % 2 === 1;
        const sibling = isRight ? level[index - 1] : level[index + 1];
        proof.push([sibling, isRight ? "left" : "right"]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafData, proof, root) {
    let current = sha256(leafData);
    for (const [siblingHash, side] of proof) {
        current = side === "left" ? sha256(siblingHash + current) : sha256(current + siblingHash);
    }
    return current === root;
}

// Demo
const files = ["invoice_1.pdf", "invoice_2.pdf", "invoice_3.pdf", "invoice_4.pdf"];
const tree = buildMerkleTree(files);
const root = getRoot(tree);

console.log("Merkle Root:", root);

const proof = getProof(tree, 2); // prove invoice_3.pdf is authentic
console.log("Valid file passes:", verifyProof(files[2], proof, root));
console.log("Tampered file fails:", verifyProof("invoice_3_TAMPERED.pdf", proof, root));
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build Time** | O(n) | Every leaf and internal node is hashed exactly once |
| **Proof Size** | O(log n) | One sibling hash per tree level |
| **Verify Time** | O(log n) | One hash combination per proof entry |
| **Space** | O(n) | The full tree stores roughly 2n hashes total |

Compare that to naive per-chunk verification, which needs the full list of `n` trusted hashes shipped and stored everywhere. A Merkle proof for 1 chunk out of 1 million costs **~20 hashes**, not a million.

---

## One Minute Insight

> **Trust doesn't have to be all-or-nothing — it can be logarithmic.** A Merkle tree compresses an entire dataset's integrity into one small root hash, then lets you selectively "unzip" just enough of the tree to prove any single fact about it.

That's the same trick behind Git's blazing-fast `diff`, Bitcoin's lightweight wallets, and database replicas that resync gigabytes by comparing a handful of hashes instead of every row. Whenever you find yourself asking "do I really need to re-check *everything* to trust *one* thing?" — a Merkle tree is probably the answer.

*Run `code.py` or `code.js` to see it in action.*
