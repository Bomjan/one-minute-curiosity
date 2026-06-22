# The Tree That Catches Liars

Two computers each hold a copy of the same dataset — a Git repo, a blockchain ledger, a replicated database. How do they check if the copies still match, without sending the entire dataset over the wire?

---

## The Problem

Imagine two friends each have a 10,000-page book and want to know if a single word was changed in either copy. Reading both books cover-to-cover works, but it's painfully slow — **O(n)** comparisons for `n` pages.

Instead, imagine summarizing every page with a fingerprint, then summarizing pairs of fingerprints into a bigger fingerprint, and repeating until you have **one fingerprint for the whole book**. If the final fingerprints match, the books are identical — guaranteed. If they don't match, you only need to walk back down the *specific branch* that disagrees to find the changed page.

This structure is a **Merkle tree**: a binary tree where every leaf is the hash of a data block, and every internal node is the hash of its two children. The root is a single hash that represents the entire dataset.

---

## Example

```
Blocks A: ["alpha", "bravo", "charlie", "delta"]
Blocks B: ["alpha", "bravo", "CHARLIE-EDITED", "delta"]

Leaf hashes:     H(alpha) H(bravo) H(charlie/EDITED) H(delta)
Pair hashes:     H(H0+H1)          H(H2+H3)
Root:                  H(pair0 + pair1)

Root A != Root B  →  datasets differ
Walk down only the branch that disagrees → block index 2 is the culprit
```

No need to compare "alpha", "bravo", or "delta" at all — the mismatch is isolated in **O(log n)** steps instead of scanning all `n` blocks.

---

## Why It Matters

Merkle trees power some of the most widely used systems in computing:

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies changed files/commits via tree hashes, not full diffs |
| **Blockchain** | Bitcoin and Ethereum use Merkle roots to verify a transaction belongs to a block without downloading the whole block |
| **Distributed databases** | Cassandra, DynamoDB, and Riak use Merkle trees for **anti-entropy** — syncing replicas by only transferring the parts that diverged |
| **P2P file sharing** | BitTorrent verifies downloaded chunks against a Merkle root before trusting them |
| **Cybersecurity** | Certificate Transparency logs use Merkle trees to prove a certificate was publicly logged, tamper-evidently |

The core idea: **verify integrity of huge data with one small hash, and pinpoint discrepancies without a full scan.**

---

## Solution

### The Key Insight: Hash Bottom-Up, Compare Top-Down

**Building** is bottom-up:
1. Hash every data block → leaf level.
2. Hash pairs of hashes → next level up.
3. Repeat until one hash remains → the **root**.

**Comparing** is top-down:
1. If two roots match, the datasets are *provably* identical (barring hash collisions).
2. If roots differ, only descend into child nodes whose hashes differ.
3. Repeat recursively — branches that already match are skipped entirely.

This means comparing two mostly-identical datasets costs **O(log n)** per actual difference, not O(n) for the whole dataset.

### Step-by-Step Walkthrough

```
Level 0 (leaves):     H0   H1   H2'  H3      (H2' changed)
Level 1 (pairs):      P(H0,H1)   P(H2',H3)
Level 2 (root):           R'

Compare roots: R != R'  → descend
Compare level 1: P(H0,H1) matches → skip left branch entirely
                 P(H2,H3) differs → descend into it
Compare level 0: H2 != H2' → found the change. H3 == H3 → not a real diff.

Result: block 2 is the only mismatch.
```

---

## Code

### Python

```python
import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks):
    level = [_hash(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left
            next_level.append(_hash((left + right).encode()))
        tree.append(next_level)
        level = next_level

    return tree


def find_differing_blocks(tree_a, tree_b):
    if tree_a[-1][0] == tree_b[-1][0]:
        return []

    candidates = [0]
    for depth in range(len(tree_a) - 1, 0, -1):
        next_candidates = []
        for idx in candidates:
            if tree_a[depth][idx] != tree_b[depth][idx]:
                next_candidates.append(idx * 2)
                if idx * 2 + 1 < len(tree_a[depth - 1]):
                    next_candidates.append(idx * 2 + 1)
        candidates = next_candidates

    return [idx for idx in candidates if tree_a[0][idx] != tree_b[0][idx]]


blocks_a = [b"alpha", b"bravo", b"charlie", b"delta"]
blocks_b = [b"alpha", b"bravo", b"CHARLIE-EDITED", b"delta"]

tree_a = build_merkle_tree(blocks_a)
tree_b = build_merkle_tree(blocks_b)

print(find_differing_blocks(tree_a, tree_b))  # [2]
```

### JavaScript

```javascript
const crypto = require("crypto");

function hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(hash);
    const tree = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1] !== undefined ? level[i + 1] : left;
            nextLevel.push(hash(left + right));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }

    return tree;
}

function findDifferingBlocks(treeA, treeB) {
    if (treeA[treeA.length - 1][0] === treeB[treeB.length - 1][0]) return [];

    let candidates = [0];
    for (let depth = treeA.length - 1; depth > 0; depth--) {
        const nextCandidates = [];
        for (const idx of candidates) {
            if (treeA[depth][idx] !== treeB[depth][idx]) {
                nextCandidates.push(idx * 2);
                if (idx * 2 + 1 < treeA[depth - 1].length) {
                    nextCandidates.push(idx * 2 + 1);
                }
            }
        }
        candidates = nextCandidates;
    }

    return candidates.filter((idx) => treeA[0][idx] !== treeB[0][idx]);
}

const blocksA = ["alpha", "bravo", "charlie", "delta"];
const blocksB = ["alpha", "bravo", "CHARLIE-EDITED", "delta"];

console.log(findDifferingBlocks(buildMerkleTree(blocksA), buildMerkleTree(blocksB))); // [2]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build Time** | O(n) | Hash every block once, then every pair once per level |
| **Compare Time** | O(d × k) | `d = log n` tree depth, `k` = number of actual differences; matching branches are skipped entirely |
| **Space** | O(n) | One hash stored per node across all levels (~2n total) |

Compare that to a naive full scan, which always costs **O(n)** regardless of how few blocks actually changed. Merkle trees turn "compare everything" into "compare only what's suspicious."

---

## One Minute Insight

> **You don't need to see all the data to trust all the data — you just need one hash that mathematically commits to it.** Merkle trees compress an entire dataset's integrity into a single fingerprint, and when that fingerprint changes, the tree itself tells you exactly where to look. It's the same instinct as binary search, applied to trust instead of values.

*Run `code.py` or `code.js` to see it in action.*
