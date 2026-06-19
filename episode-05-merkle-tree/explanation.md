# The Tree That Catches a Single Changed Byte

> *"Don't compare the haystack. Compare one number that summarizes it — and that number breaks if even a needle moves."*

---

## The Problem

Imagine two servers each hold a copy of a 10 GB file (or a million-row database, or a blockchain ledger). You want to answer one question:

**"Are these two copies *identical*?"**

The naive approach: download both copies and compare byte-by-byte. That's slow, expensive, and wasteful — especially if they're 99.9999% the same and only one byte differs somewhere in the middle.

What if you could compress the *entire dataset* into a single short fingerprint, such that:

- If even **one bit** changes anywhere, the fingerprint changes completely.
- You can also prove that *one specific item* belongs to the dataset — without sending the whole dataset.

That's exactly what a **Merkle Tree** does.

---

## Example

Take 4 transactions:

```
T0: Alice->Bob:10
T1: Bob->Carol:5
T2: Carol->Dave:2
T3: Dave->Alice:1
```

Hash each one (leaves), then hash pairs of hashes going up, until one hash remains — the **root**:

```
H0=hash(T0)   H1=hash(T1)   H2=hash(T2)   H3=hash(T3)
      \           /               \           /
     hash(H0+H1)               hash(H2+H3)
              \                     /
               hash( ... + ... ) = ROOT
```

Now change `T1` from `Bob->Carol:5` to `Bob->Carol:500`:

```
Root before: b54c513a8921647c651cab3b40555db04ffcc8b365d811f53594c7b371f7bfd7
Root after:  82da6d943b445788b074337e28507b5e5c315ef736a3d205431d72f67545ef97
```

One digit changed → a completely different root. **Tampering is impossible to hide.**

---

## Why It Matters

Merkle Trees are the quiet backbone of integrity-checking across the industry:

| System | Use Case |
|---|---|
| **Git** | Every commit hash transitively depends on the hash of every file and ancestor commit |
| **Bitcoin / Ethereum** | Each block header stores the Merkle root of all transactions in that block |
| **Cassandra / DynamoDB** | "Anti-entropy" repair — nodes compare Merkle roots to find which data ranges differ |
| **Certificate Transparency** | Proves a TLS certificate was logged publicly, without downloading the whole log |
| **IPFS / BitTorrent** | Verify a downloaded chunk is correct without trusting the peer that sent it |

The superpower isn't just "detect tampering" — it's **localizing** it. A normal hash of the whole dataset tells you *something* changed. A Merkle Tree, combined with a small **proof** (a handful of sibling hashes), lets you verify that *one specific item* is part of a dataset of millions, in `O(log n)` time, without touching the rest.

---

## Solution

**Building the tree:**
1. Hash every item → these become the **leaf nodes**.
2. Pair up adjacent hashes and hash them together → next level up.
3. If a level has an odd number of nodes, duplicate the last one.
4. Repeat until only one hash remains — the **root**.

**Proving membership (Merkle proof):**
To prove leaf `i` is in the tree, you only need the **sibling hash at each level** along the path from that leaf to the root — not the entire dataset. The verifier re-hashes upward using those siblings and checks if the result equals the known root.

**Walkthrough for `T1`:**
- Combine `H1` with its sibling `H0` → get the parent hash.
- Combine that parent with its sibling (the right subtree's hash) → get the root.
- If the recomputed root matches the published root, `T1` is proven to be part of the original dataset — and untampered.

---

## Code

### Python

```python
import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class MerkleTree:
    """Builds a binary hash tree so a single root hash can vouch for an entire dataset."""

    def __init__(self, items: list[str]):
        self.leaves = [_hash(item) for item in items]
        self.levels = self._build(self.leaves)

    def _build(self, leaves: list[str]) -> list[list[str]]:
        levels = [leaves]
        current = leaves
        while len(current) > 1:
            if len(current) % 2 == 1:
                current = current + [current[-1]]  # duplicate last node if odd
            current = [
                _hash(current[i] + current[i + 1])
                for i in range(0, len(current), 2)
            ]
            levels.append(current)
        return levels

    @property
    def root(self) -> str:
        return self.levels[-1][0]

    def get_proof(self, index: int) -> list[tuple[str, str]]:
        """Returns the sibling hashes needed to recompute the root for `leaves[index]`."""
        proof = []
        for level in self.levels[:-1]:
            if index % 2 == 0:
                sibling_index = index + 1 if index + 1 < len(level) else index
                proof.append((level[sibling_index], "right"))
            else:
                proof.append((level[index - 1], "left"))
            index //= 2
        return proof


def verify_proof(leaf_hash: str, proof: list[tuple[str, str]], root: str) -> bool:
    current = leaf_hash
    for sibling, side in proof:
        current = _hash(current + sibling) if side == "right" else _hash(sibling + current)
    return current == root


if __name__ == "__main__":
    transactions = ["Alice->Bob:10", "Bob->Carol:5", "Carol->Dave:2", "Dave->Alice:1"]
    tree = MerkleTree(transactions)
    print("Root:", tree.root)

    # Prove transaction[1] belongs to the tree without sharing the rest of the data
    leaf_hash = tree.leaves[1]
    proof = tree.get_proof(1)
    print("Proof valid:", verify_proof(leaf_hash, proof, tree.root))

    # Now tamper with a single transaction
    tampered = MerkleTree(["Alice->Bob:10", "Bob->Carol:500", "Carol->Dave:2", "Dave->Alice:1"])
    print("Tampered root:", tampered.root)
    print("Roots match:", tree.root == tampered.root)
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class MerkleTree {
  // Builds a binary hash tree so a single root hash can vouch for an entire dataset.
  constructor(items) {
    this.leaves = items.map((item) => sha256(item));
    this.levels = this.#build(this.leaves);
  }

  #build(leaves) {
    const levels = [leaves];
    let current = leaves;
    while (current.length > 1) {
      if (current.length % 2 === 1) {
        current = [...current, current[current.length - 1]]; // duplicate last node if odd
      }
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        next.push(sha256(current[i] + current[i + 1]));
      }
      levels.push(next);
      current = next;
    }
    return levels;
  }

  get root() {
    return this.levels[this.levels.length - 1][0];
  }

  // Returns the sibling hashes needed to recompute the root for leaves[index].
  getProof(index) {
    const proof = [];
    for (let level = 0; level < this.levels.length - 1; level++) {
      const nodes = this.levels[level];
      if (index % 2 === 0) {
        const siblingIndex = index + 1 < nodes.length ? index + 1 : index;
        proof.push([nodes[siblingIndex], "right"]);
      } else {
        proof.push([nodes[index - 1], "left"]);
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }
}

function verifyProof(leafHash, proof, root) {
  let current = leafHash;
  for (const [sibling, side] of proof) {
    current = side === "right" ? sha256(current + sibling) : sha256(sibling + current);
  }
  return current === root;
}

const transactions = ["Alice->Bob:10", "Bob->Carol:5", "Carol->Dave:2", "Dave->Alice:1"];
const tree = new MerkleTree(transactions);
console.log("Root:", tree.root);

// Prove transaction[1] belongs to the tree without sharing the rest of the data
const leafHash = tree.leaves[1];
const proof = tree.getProof(1);
console.log("Proof valid:", verifyProof(leafHash, proof, tree.root));

// Now tamper with a single transaction
const tampered = new MerkleTree(["Alice->Bob:10", "Bob->Carol:500", "Carol->Dave:2", "Dave->Alice:1"]);
console.log("Tampered root:", tampered.root);
console.log("Roots match:", tree.root === tampered.root);
```

---

## Complexity

| Operation | Time | Space |
|---|---|---|
| **Build tree** | O(n) | O(n) |
| **Generate proof** | O(log n) | O(log n) |
| **Verify proof** | O(log n) | O(1) |
| **Compare two datasets** | O(1) (compare roots) | O(1) |

Where `n` is the number of items. Comparing two 10 GB datasets becomes comparing two 64-character strings — and proving any single record's integrity costs only a handful of hashes, not the whole dataset.

---

## One Minute Insight

> A Merkle Tree turns "trust the whole dataset" into "trust one small number, plus a short proof for whatever you actually care about." That's the same trick that lets a thin mobile wallet verify a Bitcoin transaction without downloading the entire blockchain — **local verification of global integrity** is one of the most quietly powerful ideas in computing.
