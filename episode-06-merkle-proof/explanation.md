# The Proof That Fits in Your Pocket

Somewhere, a Bitcoin wallet on your phone just verified a transaction happened — without downloading the 500GB blockchain. Git just confirmed a file in your repo wasn't tampered with — without re-scanning every commit. Same trick, same math.

---

## The Problem

You have a massive, immutable dataset — a blockchain block with 50,000 transactions, a Git repository, a database replica. Someone asks a simple question:

> "Prove that transaction #47,238 is really in this dataset — without sending me the whole thing."

Sending everything is safe but wasteful: O(n) data for a single yes/no answer. Sending just the item alone isn't enough — anyone could claim any value belongs. You need a **short, tamper-proof receipt**.

**Your goal:** prove membership of one item using as little extra data as possible — ideally O(log n), not O(n).

---

## Example

```
8 transactions, hashed into leaves: h0..h7

                      root
                    /      \
                 h01234567
                /          \
            h0123          h4567
           /     \        /     \
         h01     h23    h45     h67
        /  \    /  \   /  \    /  \
      h0   h1  h2  h3 h4  h5  h6  h7

Prove tx at index 2 (h2) is in the tree:
  proof = [h3 (right sibling), h01 (left sibling), h4567 (left sibling)]

Verifier recomputes:
  h23   = hash(h2 + h3)
  h0123 = hash(h01 + h23)
  root' = hash(h0123 + h4567)

If root' == known root → tx #2 is proven, using only 3 hashes
instead of downloading all 8 transactions.
```

---

## Why It Matters

This is called a **Merkle proof**, and it quietly runs the internet's trust infrastructure:

| Domain | Real-World Use |
| :--- | :--- |
| **Blockchain** | SPV wallets verify a transaction without storing the full chain |
| **Version control** | Git detects any corrupted commit, tree, or blob instantly |
| **Databases** | Cassandra/DynamoDB compare replicas for anti-entropy repair |
| **CDNs & package managers** | npm/pip verify downloaded packages weren't tampered with |
| **Cybersecurity** | Certificate Transparency logs prove a certificate was publicly logged |

The deeper lesson: **hierarchical hashing turns a global "is this dataset intact?" question into a local "does this one small path check out?" question.**

---

## Solution

### The Key Insight: Hash Pairs, Recursively

1. Hash every data item into a **leaf**.
2. Hash pairs of leaves together to form the next level up. If a level has an odd count, duplicate the last node.
3. Repeat until one hash remains: the **root**. It's a fingerprint of the entire dataset — flip one bit anywhere, and the root changes.

### Proving Membership Without Full Data

To prove leaf `i` belongs, you don't need the other leaves — only the **sibling hash at each level** on the path from that leaf to the root (the "Merkle proof" or "Merkle path"). That's `log2(n)` hashes total.

The verifier combines the leaf with each sibling hash, level by level, and checks if the final result matches the already-trusted root. If any single hash in the proof or the leaf itself was altered, the recomputed root won't match.

### Walkthrough

```
Tree has 8 leaves → height = 3 → proof size = 3 hashes.
1,000,000 leaves  → height ≈ 20 → proof size = 20 hashes.

Doubling the dataset adds just ONE more hash to the proof.
That's the power of O(log n).
```

---

## Code

### Python

```python
import hashlib


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_layers(leaves):
    """Build every level of the Merkle tree, bottom (leaves) to top (root)."""
    layers = [leaves]
    current = leaves
    while len(current) > 1:
        next_level = []
        for i in range(0, len(current), 2):
            left = current[i]
            right = current[i + 1] if i + 1 < len(current) else left
            next_level.append(sha256_hex(left + right))
        layers.append(next_level)
        current = next_level
    return layers  # layers[-1][0] is the root


def get_proof(layers, index):
    """Return the sibling hash + side needed at each level to reach the root."""
    proof = []
    idx = index
    for level in layers[:-1]:
        sibling_idx = idx ^ 1
        sibling = level[sibling_idx] if sibling_idx < len(level) else level[idx]
        proof.append((sibling, idx % 2 == 1))  # True = sibling is on the left
        idx //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    computed = leaf_hash
    for sibling, sibling_is_left in proof:
        computed = sha256_hex(sibling + computed) if sibling_is_left else sha256_hex(computed + sibling)
    return computed == root


if __name__ == "__main__":
    transactions = [f"tx{i}" for i in range(8)]
    leaves = [sha256_hex(tx) for tx in transactions]
    layers = build_layers(leaves)
    root = layers[-1][0]

    index = 2  # proving "tx2" is in the dataset
    proof = get_proof(layers, index)

    print("Root:", root)
    print("Valid proof:", verify_proof(leaves[index], proof, root))          # True
    print("Tampered leaf:", verify_proof(sha256_hex("fake-tx"), proof, root))  # False
```

### JavaScript

```javascript
const crypto = require('crypto');

function sha256Hex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function buildLayers(leaves) {
    const layers = [leaves];
    let current = leaves;
    while (current.length > 1) {
        const next = [];
        for (let i = 0; i < current.length; i += 2) {
            const left = current[i];
            const right = i + 1 < current.length ? current[i + 1] : left;
            next.push(sha256Hex(left + right));
        }
        layers.push(next);
        current = next;
    }
    return layers; // layers[layers.length - 1][0] is the root
}

function getProof(layers, index) {
    const proof = [];
    let idx = index;
    for (let level = 0; level < layers.length - 1; level++) {
        const nodes = layers[level];
        const siblingIdx = idx ^ 1;
        const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx];
        proof.push({ sibling, siblingIsLeft: idx % 2 === 1 });
        idx = Math.floor(idx / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let computed = leafHash;
    for (const { sibling, siblingIsLeft } of proof) {
        computed = siblingIsLeft ? sha256Hex(sibling + computed) : sha256Hex(computed + sibling);
    }
    return computed === root;
}

const transactions = Array.from({ length: 8 }, (_, i) => `tx${i}`);
const leaves = transactions.map(sha256Hex);
const layers = buildLayers(leaves);
const root = layers[layers.length - 1][0];

const index = 2; // proving "tx2" is in the dataset
const proof = getProof(layers, index);

console.log('Root:', root);
console.log('Valid proof:', verifyProof(leaves[index], proof, root));            // true
console.log('Tampered leaf:', verifyProof(sha256Hex('fake-tx'), proof, root));   // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (build tree)** | O(n) | Each of the n items is hashed once, then halved each level |
| **Time (proof size / verify)** | O(log n) | Height of a balanced binary tree over n leaves |
| **Space** | O(n) for the tree, O(log n) for a single proof | The full tree is built once; a proof only carries the path |

The naive alternative — shipping every leaf to prove one — is O(n). The Merkle proof compresses that down to a handful of hashes, no matter how large the dataset grows.

---

## One Minute Insight

> **You don't need the whole truth to trust part of it — you just need an unbroken chain of fingerprints back to something you already trust.**

A Merkle tree turns "verify everything" into "verify one path." Doubling the dataset costs you one extra hash in the proof, not double the data. That's why blockchains, Git, and distributed databases all converge on the same idea: hash small pieces, hash the hashes, and trust cascades all the way to a single root.

*Run `code.py` or `code.js` to see it in action.*
