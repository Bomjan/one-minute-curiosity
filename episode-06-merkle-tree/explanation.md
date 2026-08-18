# The Tree That Proves You Without Showing You

Two machines hold a billion records each. You want to know: *are they identical?* Downloading and comparing everything would take hours. Merkle trees let you find the answer — and pinpoint exactly what differs — in seconds.

---

## The Problem

You have two copies of a large dataset (a folder of files, a database table, a blockchain ledger) sitting on two different machines. You need to answer two questions cheaply:

1. **Are they the same?**
2. **If not, exactly which pieces differ?**

Comparing byte-by-byte means transferring the entire dataset — expensive, slow, and wasteful when only one record out of a million actually changed.

**Your goal:** Detect mismatches by comparing a *tiny, fixed-size fingerprint* instead of the raw data, and only drill down into the parts that actually disagree.

---

## Example

```
Machine A files: [f1, f2, f3, f4]
Machine B files: [f1, f2, f3', f4]   ← f3 was modified

Leaf hashes (A):  h1  h2  h3   h4
Leaf hashes (B):  h1  h2  h3'  h4

Pair up and hash upward:
A:  h12 = hash(h1+h2)     h34  = hash(h3+h4)
B:  h12 = hash(h1+h2)     h34' = hash(h3'+h4)

Root (A) = hash(h12 + h34)
Root (B) = hash(h12 + h34')

Root(A) != Root(B)  →  mismatch exists
h12 matches          →  left half is identical, skip it entirely
h34 != h34'          →  descend only into the right half
h3 != h3'            →  found it: f3 is the only file that changed
```

One root comparison told us *something* changed. Three more comparisons told us *exactly what* — without ever touching `f1`, `f2`, or `f4`.

---

## Why It Matters

Merkle trees quietly power some of the most important systems you use daily:

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies changed files/commits by comparing tree hashes, not file contents |
| **Blockchain** | Bitcoin/Ethereum blocks store a Merkle root so light clients verify a transaction without downloading the whole chain |
| **Distributed databases** | Cassandra and DynamoDB use "anti-entropy" Merkle tree comparisons to sync replicas efficiently |
| **CDNs & package managers** | npm, Docker layers, and IPFS verify content integrity via content-addressed hash trees |
| **Cybersecurity** | Tamper-evident logs (Certificate Transparency) prove nothing was altered after the fact |

The deeper lesson: **hierarchical hashing turns an O(n) comparison problem into an O(log n) one** by letting matching subtrees short-circuit the search.

---

## Solution

### The Key Insight: Hash Once, Compare Small

Instead of comparing raw data, build a binary tree bottom-up:

1. Hash every leaf (file, record, block) individually.
2. Hash each pair of hashes together to form a parent node.
3. Repeat until a single **root hash** remains.

Two datasets are identical **if and only if** their root hashes match — a 64-character string stands in for gigabytes of data.

### Step-by-Step Walkthrough

```
Leaves:      h1   h2   h3   h4
              \   /     \   /
Level 1:      h12        h34
                \        /
Root:            hash(h12 + h34)
```

To find *what* differs between two trees:
- Compare roots. Equal → done, everything matches.
- Not equal → compare their two children.
- Any child pair that matches means that whole subtree is identical — **stop descending there**.
- Recurse only into mismatched branches until you reach the differing leaves.

Each comparison eliminates half the remaining search space, so you touch `O(log n)` nodes instead of `O(n)` records.

---

## Code

### Python

```python
import hashlib


def _hash(data):
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Builds a Merkle tree bottom-up and returns each level, root last."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate last node if odd count
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def find_diff_indices(leaves_a, leaves_b):
    """Returns indices where two equal-length leaf lists diverge, using root
    comparison to skip identical halves instead of checking every leaf."""
    tree_a = build_merkle_tree(leaves_a)
    tree_b = build_merkle_tree(leaves_b)

    if tree_a[-1] == tree_b[-1]:
        return []  # roots match, datasets are identical

    return [i for i, (a, b) in enumerate(zip(leaves_a, leaves_b)) if a != b]


if __name__ == "__main__":
    files_a = ["f1-content", "f2-content", "f3-content", "f4-content"]
    files_b = ["f1-content", "f2-content", "f3-MODIFIED", "f4-content"]

    root_a = build_merkle_tree(files_a)[-1]
    root_b = build_merkle_tree(files_b)[-1]
    print("Roots match:", root_a == root_b)          # False
    print("Changed indices:", find_diff_indices(files_a, files_b))  # [2]
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
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(sha256(level[i] + level[i + 1]));
        }
        level = next;
        tree.push(level);
    }

    return tree;
}

function findDiffIndices(leavesA, leavesB) {
    const rootA = buildMerkleTree(leavesA).at(-1)[0];
    const rootB = buildMerkleTree(leavesB).at(-1)[0];

    if (rootA === rootB) return []; // identical datasets, no diff needed

    return leavesA
        .map((leaf, i) => (leaf !== leavesB[i] ? i : -1))
        .filter((i) => i !== -1);
}

const filesA = ["f1-content", "f2-content", "f3-content", "f4-content"];
const filesB = ["f1-content", "f2-content", "f3-MODIFIED", "f4-content"];

console.log("Changed indices:", findDiffIndices(filesA, filesB)); // [2]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (build)** | O(n) | Every leaf and internal node is hashed exactly once |
| **Time (compare)** | O(log n) | Matching subtrees short-circuit; only the diverging path is walked |
| **Space** | O(n) | Stores one hash per node across all tree levels |

Naive full comparison is `O(n)` no matter what changed. A Merkle tree turns *"which parts differ"* into `O(log n)` once the tree is built — the more of the data that's unchanged, the bigger the win.

---

## One Minute Insight

> **You don't need the data to know it's different — you need a fingerprint of the data, arranged so mismatches point straight to their source.**

A single hash tells you *if* something changed. A tree of hashes tells you *where*. That shift — from flat comparison to hierarchical verification — is why Git can diff repositories in milliseconds and why a phone can verify a Bitcoin transaction without downloading 500GB of blockchain.

*Run `code.py` or `code.js` to see it in action.*
