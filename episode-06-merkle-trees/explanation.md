# One Hash to Verify a Million Files

Git, Bitcoin, and Cassandra all solve the same quiet problem: how do you prove a huge pile of data hasn't been tampered with, without reading the whole pile? The answer is a tree of hashes so small it fits in a tweet.

---

## The Problem

Imagine you download a 50 GB dataset and someone claims "it's unmodified." How do you check? Re-hashing all 50 GB works, but it's slow, and it doesn't help if you only care about *one* file inside that dataset.

Now imagine two servers each hold a million database rows and need to find out where they disagree — without shipping a million rows across the network to compare.

Both problems need the same trick: a way to fingerprint a huge collection of data with one small hash, and a way to prove any single piece belongs to that collection *without* revealing or re-hashing everything else.

That trick is a **Merkle tree**: hash the data blocks, hash pairs of those hashes together, and keep pairing up until one hash — the **root** — represents the entire dataset. Change one byte anywhere, and the root changes.

---

## Example

```
Data blocks:  A   B   C   D
               |   |   |   |
             h(A) h(B) h(C) h(D)          ← leaves
               \  /       \  /
              h(h(A)+h(B)) h(h(C)+h(D))    ← level 1
                       \    /
                    h( level1[0] + level1[1] )  ← ROOT

Root = "6da0b96b..." (one 64-character fingerprint for all 4 blocks)
```

If block `C` changes even slightly, `h(C)` changes, which changes `level1[1]`, which changes the root. Every block's integrity is baked into that single hash.

Even better: to prove block `C` is genuine, you don't need blocks `A`, `B`, or `D` — just two sibling hashes (`h(D)` and `level1[0]`) and the root. That's a **Merkle proof**.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies every commit and tree object by a hash built the same way — one root hash detects any change anywhere in history |
| **Blockchain** | Bitcoin blocks store a Merkle root of all transactions, so light clients verify one transaction without downloading the whole block |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for anti-entropy repair — comparing roots first, then only walking down the branches that differ |
| **Content addressing** | IPFS and Git both use hash trees so identical data is automatically deduplicated |
| **Security & auditing** | Certificate Transparency logs use Merkle proofs so anyone can verify a certificate was logged, without downloading the entire log |

The underlying idea: **push verification cost from O(n) down to O(log n)** by organizing hashes hierarchically instead of flatly.

---

## Solution

### The Key Insight: Hash Pairs, Not the Whole Thing

1. Hash every data block individually — these become the **leaves**.
2. Pair up adjacent hashes and hash the concatenation — this becomes the next level up.
3. Repeat until only one hash remains — the **root**.
4. To prove a leaf belongs to the tree, walk back up collecting only the *sibling* hash at each level (not the whole subtree). Recompute the root from the leaf and those siblings — if it matches the trusted root, the leaf is genuine.

### Step-by-Step Walkthrough

```
Leaves:  h(A) h(B) h(C) h(D)
Index:    0    1    2    3

Proving index 2 ("C"):
  Level 0: sibling of index 2 is index 3 → collect (h(D), side="right")
           index becomes 2 // 2 = 1
  Level 1: sibling of index 1 is index 0 → collect (level1[0], side="left")
           index becomes 1 // 2 = 0
  Stop — reached the root level.

Verify:
  current = h(C)
  current = h(current + h(D))        // matches level1[1]
  current = h(level1[0] + current)   // matches root
  current == root → proof valid ✓
```

Notice the proof for a tree of **4 blocks** takes only **2** hashes. For **1,000,000** blocks, it takes just **~20** hashes — that's the power of `log2(n)`.

---

## Code

### Python

```python
import hashlib


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Build every level of a Merkle tree, from raw leaves up to the root."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # odd count: duplicate the last hash
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Collect the sibling hash (and its side) at each level for one leaf."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        is_right_child = index % 2 == 1
        sibling_index = index - 1 if is_right_child else index + 1
        proof.append((level[sibling_index], "left" if is_right_child else "right"))
        index //= 2
    return proof


def verify_proof(leaf, proof, root):
    """Recompute the root from just a leaf + its proof, no full tree needed."""
    current = _hash(leaf)
    for sibling, side in proof:
        current = _hash(sibling + current) if side == "left" else _hash(current + sibling)
    return current == root


if __name__ == "__main__":
    blocks = ["block-A", "block-B", "block-C", "block-D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print(f"Merkle root: {root}")

    proof = get_proof(tree, 2)  # prove "block-C" belongs to the set
    print("Genuine leaf verifies:", verify_proof("block-C", proof, root))   # True
    print("Tampered leaf fails:  ", verify_proof("block-X", proof, root))   # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Build every level of a Merkle tree, from raw leaves up to the root.
function buildMerkleTree(leaves) {
  let level = leaves.map(hash);
  const tree = [level];

  while (level.length > 1) {
    if (level.length % 2 === 1) {
      level = [...level, level[level.length - 1]]; // odd count: duplicate last hash
    }
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(hash(level[i] + level[i + 1]));
    }
    tree.push(next);
    level = next;
  }

  return tree;
}

// Collect the sibling hash (and its side) at each level for one leaf.
function getProof(tree, index) {
  const proof = [];
  for (let i = 0; i < tree.length - 1; i++) {
    let level = tree[i];
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
    const isRightChild = index % 2 === 1;
    const siblingIndex = isRightChild ? index - 1 : index + 1;
    proof.push({ hash: level[siblingIndex], side: isRightChild ? "left" : "right" });
    index = Math.floor(index / 2);
  }
  return proof;
}

// Recompute the root from just a leaf + its proof, no full tree needed.
function verifyProof(leaf, proof, root) {
  let current = hash(leaf);
  for (const { hash: sibling, side } of proof) {
    current = side === "left" ? hash(sibling + current) : hash(current + sibling);
  }
  return current === root;
}

const blocks = ["block-A", "block-B", "block-C", "block-D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log(`Merkle root: ${root}`);

const proof = getProof(tree, 2); // prove "block-C" belongs to the set
console.log("Genuine leaf verifies:", verifyProof("block-C", proof, root)); // true
console.log("Tampered leaf fails:  ", verifyProof("block-X", proof, root)); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build time** | O(n) | Every block is hashed once, then pairs are hashed once per level (`n + n/2 + n/4 + ... ≈ 2n`) |
| **Proof size** | O(log n) | One sibling hash per level, and the tree has `log2(n)` levels |
| **Verify time** | O(log n) | Recomputing the root walks the same number of levels as the proof |
| **Space** | O(n) | The full tree stores roughly `2n` hashes across all levels |

Compare that to naively re-hashing the entire dataset to verify one block — O(n) every time. A Merkle tree pays O(n) once at build time so every future proof costs only O(log n).

---

## One Minute Insight

> **Hierarchy turns "check everything" into "check log(everything)."** A Merkle tree doesn't store more information than a flat hash — it organizes the same information so that trust can be verified in pieces, not all at once.

This is why it shows up everywhere data needs to be trusted without being fully transferred: Git commits, Bitcoin blocks, database repair, and audit logs all lean on the same one-sentence idea — *one tampered leaf, however deep, always bubbles up and changes the root.*

*Run `code.py` or `code.js` to see it in action.*
