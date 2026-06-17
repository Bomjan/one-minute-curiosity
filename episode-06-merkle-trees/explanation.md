# Prove It Without Showing It

Git, blockchains, and BitTorrent all solve the same quiet problem: how do you prove one tiny piece of data belongs to a massive dataset, without re-downloading or re-hashing the whole thing?

---

## The Problem

Imagine a dataset with a million records. You want to prove that record #482,019 is genuine and untampered — but you refuse to:

- send the entire dataset, or
- re-hash all million records just to check one.

A naive integrity check hashes everything and compares. That's **O(n)** work for a single lookup, every time.

There's a smarter structure that lets you prove membership of *one* item using only **O(log n)** hashes: the **Merkle Tree**.

---

## Example

```
Blocks: [A, B, C, D, E]

Leaves:    h(A)  h(B)  h(C)  h(D)  h(E)  h(E)*
              \   /       \   /       \   /
Level 1:    h(AB)        h(CD)        h(EE)
                 \          |          /
Level 2:           h(h(AB)+h(CD))   h(h(EE))
                          \           /
Root:                  h(everything combined)

* odd leaf duplicated to keep pairs even
```

To prove **C** is genuine, you don't resend A, B, D, E.
You only need `h(D)` and `h(h(AB))` — the **sibling hashes** on the path to the root. Combine them with `h(C)` step by step, and if the result matches the published root, C is provably authentic.

---

## Why It Matters

Merkle Trees are quietly everywhere:

| Domain | Use |
| :--- | :--- |
| **Git** | Every commit's tree hash detects if a single file changed, anywhere in history |
| **Blockchain** | Each block stores one Merkle root instead of thousands of raw transactions |
| **Distributed databases** | Cassandra/DynamoDB compare Merkle roots between replicas to find which rows drifted, without scanning every row |
| **BitTorrent / CDNs** | Verify a downloaded chunk is correct before the whole file finishes |
| **Cybersecurity** | Tamper-evident logs — change one entry, and the root hash changes instantly |

The pattern: **push verification cost from O(n) down to O(log n)** by letting hashes do the heavy lifting once, then reusing them forever.

---

## Solution

### The Key Insight: Hash Pairs, Climb Up

1. Hash every block individually — these are the **leaves**.
2. Pair up adjacent hashes, concatenate them, and hash the pair. That's the next level up.
3. Repeat until only one hash remains — the **root**.

Any single-bit change in any block cascades upward and changes the root completely (hash functions guarantee this). So **the root is a fingerprint of the entire dataset.**

### Why Proofs Are Fast

To verify block `C`, you don't need the whole tree — only the hashes that sit *next to* the path from `C` up to the root (the **proof**). At each level, you know:
- the sibling hash, and
- whether it goes on the left or right when concatenating.

Recompute hashes bottom-up using only those siblings. If you land on the published root, `C` is verified. That's `log₂(n)` hashes instead of `n`.

### Walkthrough

```
Verify "block-C" with proof = [(h(D), "right"), (h(h(AB)), "left")]

Step 1: current = h("block-C")
Step 2: current = hash(current + h(D))       # combine with right sibling
Step 3: current = hash(h(h(AB)) + current)    # combine with left sibling
Step 4: current == root?  → genuine
```

---

## Code

### Python

```python
import hashlib

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def build_merkle_tree(blocks):
    level = [sha256(block.encode()) for block in blocks]
    tree = [level]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        next_level = [sha256((level[i] + level[i + 1]).encode())
                      for i in range(0, len(level), 2)]
        tree.append(next_level)
        level = next_level
    return tree

def get_proof(tree, index):
    proof = []
    for level in tree[:-1]:
        if index % 2 == 1:
            sibling, position = level[index - 1], "left"
        else:
            sibling_index = index + 1 if index + 1 < len(level) else index
            sibling, position = level[sibling_index], "right"
        proof.append((sibling, position))
        index //= 2
    return proof

def verify_proof(block, proof, root):
    current = sha256(block.encode())
    for sibling, position in proof:
        combined = sibling + current if position == "left" else current + sibling
        current = sha256(combined.encode())
    return current == root
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];
    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            nextLevel.push(sha256(level[i] + level[i + 1]));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }
    return tree;
}

function verifyProof(block, proof, root) {
    let current = sha256(block);
    for (const { sibling, position } of proof) {
        current = position === "left" ? sha256(sibling + current) : sha256(current + sibling);
    }
    return current === root;
}
```

*(Full runnable versions with `getProof` are in `code.py` / `code.js`.)*

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build tree** | O(n) | Every block is hashed once, every level halves in size |
| **Generate/verify proof** | O(log n) | One sibling hash per level, and there are log₂(n) levels |
| **Space (proof)** | O(log n) | Only the path siblings are stored, not the dataset |

Compare that to a naive full-rehash check: **O(n)** every single time you want to verify one record. Merkle Trees turn a million-record audit into a handful of hash comparisons.

---

## One Minute Insight

> **You don't need the whole truth to verify a piece of it — just a trail of fingerprints back to a single, trusted root.**

That's the real trick behind Git's integrity guarantees and blockchain's tamper-evidence: hash once, reuse forever, and let math — not bandwidth — do the proving.

*Run `code.py` or `code.js` to see it in action.*
