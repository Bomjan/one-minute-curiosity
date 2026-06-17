# The Tree That Catches Liars

How do you prove one file in a million-file backup wasn't tampered with — without re-checking the other 999,999? A clever binary tree of hashes makes it possible in milliseconds.

---

## The Problem

Imagine you have a huge list of data blocks — files in a backup, transactions in a block, chunks of a torrent. You want two things:

1. **Detect tampering**: if even one byte in one block changes, you must know.
2. **Prove it cheaply**: convince someone a specific block is unmodified, without sending or re-hashing the entire dataset.

Hashing the whole dataset into one giant hash solves rule 1, but fails rule 2 — proving block #4,217 is valid would require recomputing the hash of everything.

**The fix:** build a binary tree where every leaf is the hash of a data block, and every parent is the hash of its two children. The single hash at the top — the **Merkle root** — represents the entire dataset. To prove one block is untouched, you only need a handful of sibling hashes along its path to the root, not the whole dataset.

---

## Example

```
Blocks: ["A", "B", "C", "D"]

Leaves:   H(A)  H(B)  H(C)  H(D)
            \    /      \    /
           H(H(A)+H(B))  H(H(C)+H(D))
                  \         /
                Merkle Root

To prove "B" is untouched, you only need:
  - H(A)                  → to recompute H(H(A)+H(B))
  - H(H(C)+H(D))           → to recompute the root

That's 2 hashes instead of re-hashing A, C, and D.
```

If anyone changes "C", `H(C)` changes, which changes its parent hash,
which changes the **root**. The tampering is caught instantly, anywhere downstream.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Cybersecurity** | Verifying file integrity without trusting the whole storage system |
| **Blockchain** | Bitcoin/Ethereum use Merkle roots to summarize thousands of transactions in one block header |
| **Distributed systems** | Git uses Merkle-tree-like structures to detect changed objects efficiently |
| **Databases** | Cassandra and DynamoDB use Merkle trees to find inconsistencies between replicas without comparing every row |
| **Networking** | BitTorrent verifies downloaded pieces against a Merkle root before trusting them |

The deeper lesson: **you can verify a small piece of a huge structure by trusting math, not by re-checking everything.**

---

## Solution

### The Key Insight: Hash Pairs, Bubble Up

1. Hash every block individually — these become the **leaves**.
2. Pair up adjacent hashes and hash the pair together — these become the next level up.
3. Repeat until only **one hash remains** — the **root**.
4. To verify a single block, you only need the **sibling hashes** on the path from that leaf to the root (the "Merkle proof") — that's `O(log n)` hashes, not `O(n)`.

### Step-by-Step Walkthrough

```
1. Hash each block:        H(A), H(B), H(C), H(D)
2. Pair and hash up:        H(H(A)+H(B)),  H(H(C)+H(D))
3. Pair and hash up again:  ROOT = H( H(H(A)+H(B)) + H(H(C)+H(D)) )
4. Store only ROOT (32 bytes) to represent all 4 blocks.
5. Anyone can re-derive ROOT from a block + log2(n) sibling hashes
   to prove that block belongs, unmodified.
```

If the number of blocks is odd at any level, the last unpaired hash is
typically duplicated or carried up as-is — both are common conventions.

---

## Code

### Python

```python
import hashlib


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_root(blocks):
    # Start with the hash of each block — the leaves
    layer = [sha256(block.encode()) for block in blocks]

    # Keep pairing and hashing until one hash remains
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])  # duplicate last hash if odd count

        layer = [
            sha256((layer[i] + layer[i + 1]).encode())
            for i in range(0, len(layer), 2)
        ]

    return layer[0]


if __name__ == "__main__":
    blocks = ["A", "B", "C", "D"]
    root = build_merkle_root(blocks)
    print("Merkle Root:", root)

    # Tamper with one block and watch the root change completely
    tampered = ["A", "B", "X", "D"]
    print("Tampered Root:", build_merkle_root(tampered))
```

### JavaScript

```javascript
const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleRoot(blocks) {
    // Start with the hash of each block — the leaves
    let layer = blocks.map((block) => sha256(block));

    // Keep pairing and hashing until one hash remains
    while (layer.length > 1) {
        if (layer.length % 2 === 1) {
            layer.push(layer[layer.length - 1]); // duplicate last hash if odd
        }

        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            next.push(sha256(layer[i] + layer[i + 1]));
        }
        layer = next;
    }

    return layer[0];
}

const blocks = ["A", "B", "C", "D"];
console.log("Merkle Root:", buildMerkleRoot(blocks));

// Tamper with one block and watch the root change completely
const tampered = ["A", "B", "X", "D"];
console.log("Tampered Root:", buildMerkleRoot(tampered));
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (build)** | O(n) | Every block is hashed once, then each tree level halves in size |
| **Time (verify one block)** | O(log n) | Only sibling hashes along the path to the root are needed |
| **Space** | O(n) | Storing all leaf and intermediate hashes (or O(log n) for just a proof) |

Compare that to brute-force verification — re-hashing the entire dataset every time — which costs `O(n)` *per check*. With a Merkle tree, you pay `O(n)` once to build it, then `O(log n)` forever after.

---

## One Minute Insight

> **You don't need the whole truth to trust part of it — you need a verifiable path back to a single source of truth.**

A Merkle tree turns "trust the entire dataset" into "trust one small root hash plus a short proof." That's the same idea blockchains, Git, and distributed databases all lean on: compress integrity into something tiny, then let math do the re-verification instead of brute force.

*Run `code.py` or `code.js` to see it in action.*
