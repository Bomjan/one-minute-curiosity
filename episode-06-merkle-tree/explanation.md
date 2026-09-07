# The Tree That Catches Liars

Git, blockchains, and distributed databases all share a trick: they can prove two piles of data are identical — or pinpoint exactly what changed — without ever comparing most of the data itself.

---

## The Problem

Imagine two servers each hold a million files. You need to know: **are they in sync, and if not, which files are different?**

The naive way is to compare all million files byte-by-byte. That's slow, and worse, it means shipping the *entire dataset* across the network just to check.

There's a much smarter way: hash each file, then hash pairs of hashes together, repeatedly, until you're left with **one single hash** that represents the whole dataset. If two datasets have the same root hash, they're guaranteed identical. If the roots differ, you only need to chase down the branches that disagree — never the whole tree.

This structure is called a **Merkle Tree**, and it's one of the quietest, most load-bearing ideas in computing.

---

## Example

```
Files A: [file1, file2, file3,         file4]
Files B: [file1, file2, file3-EDITED,  file4]

Root A: b27e741c968a...
Root B: 93db57de29b5...   ← different!

Walking down from the root, only ONE branch disagrees.
Differing leaf indices: [2]  → file3 is the culprit.
```

Only one file changed out of four — and the algorithm found it by comparing hashes at each level, never touching `file1`, `file2`, or `file4` directly.

---

## Why It Matters

The Merkle Tree pattern quietly runs enormous parts of modern infrastructure:

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies exactly which files changed between commits using tree hashes |
| **Blockchain** | Bitcoin/Ethereum blocks store a Merkle root so any transaction can be verified without downloading the whole chain |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for "anti-entropy" — syncing replicas by comparing hash trees, not full datasets |
| **P2P & content addressing** | IPFS and BitTorrent verify chunks of a file independently using tree hashes |
| **Cybersecurity** | Tamper-evidence: change one byte anywhere, and the root hash changes — impossible to fake without also faking the whole path |

The deeper lesson: **a single number can represent the integrity of an entire dataset**, and disagreements can be localized in logarithmic time instead of linear time.

---

## Solution

### The Key Insight: Hash Upward, Compare Downward

1. **Build phase:** Hash every leaf (file/record). Pair up adjacent hashes and hash them together to form the next level. Repeat until one hash remains — the **root**.
2. **Compare phase:** If two roots match, the datasets are provably identical — done in O(1).
3. **Diff phase:** If roots differ, only recurse into the child whose hash disagrees. A single differing leaf means you only ever touch **one path** from root to leaf — O(log n) instead of O(n).

### Step-by-Step Walkthrough

```
Level 2 (root):     H(H01 + H23)
                    /            \
Level 1:      H01=H(h1+h2)   H23=H(h3+h4)
              /       \       /        \
Level 0:     h1       h2     h3        h4
           file1    file2  file3      file4
```

If `file3` changes, `h3` changes → `H23` changes → the root changes. But `h1`, `h2`, and `H01` are untouched. Descending the tree, you skip the entire left subtree and land directly on the single changed leaf.

---

## Code

### Python

```python
import hashlib

def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

def build_merkle_tree(leaves):
    """Return every level of the tree, bottom (leaves) to top (root)."""
    level = [sha256(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate odd leaf
            next_level.append(sha256(left + right))
        level = next_level
        tree.append(level)

    return tree

def find_differing_leaves(tree_a, tree_b):
    """Return indices of leaves that differ between two same-shaped trees."""
    if tree_a[-1][0] == tree_b[-1][0]:
        return []

    result = []

    def recurse(level, idx):
        if level == 0:
            result.append(idx)
            return

        layer_a, layer_b = tree_a[level - 1], tree_b[level - 1]
        left, right = idx * 2, idx * 2 + 1

        if right < len(layer_a):
            if layer_a[left] != layer_b[left]:
                recurse(level - 1, left)
            if layer_a[right] != layer_b[right]:
                recurse(level - 1, right)
        elif layer_a[left] != layer_b[left]:
            recurse(level - 1, left)

    recurse(len(tree_a) - 1, 0)
    return result


files_a = ["file1-data", "file2-data", "file3-data", "file4-data"]
files_b = ["file1-data", "file2-data", "file3-data-EDITED", "file4-data"]

tree_a = build_merkle_tree(files_a)
tree_b = build_merkle_tree(files_b)

print(find_differing_leaves(tree_a, tree_b))  # [2]
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
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate odd leaf
            nextLevel.push(sha256(left + right));
        }
        level = nextLevel;
        tree.push(level);
    }

    return tree;
}

function findDifferingLeaves(treeA, treeB) {
    if (treeA[treeA.length - 1][0] === treeB[treeB.length - 1][0]) return [];

    const result = [];

    function recurse(level, idx) {
        if (level === 0) {
            result.push(idx);
            return;
        }

        const layerA = treeA[level - 1];
        const layerB = treeB[level - 1];
        const left = idx * 2;
        const right = idx * 2 + 1;

        if (right < layerA.length) {
            if (layerA[left] !== layerB[left]) recurse(level - 1, left);
            if (layerA[right] !== layerB[right]) recurse(level - 1, right);
        } else if (layerA[left] !== layerB[left]) {
            recurse(level - 1, left);
        }
    }

    recurse(treeA.length - 1, 0);
    return result;
}

const filesA = ["file1-data", "file2-data", "file3-data", "file4-data"];
const filesB = ["file1-data", "file2-data", "file3-data-EDITED", "file4-data"];

console.log(findDifferingLeaves(buildMerkleTree(filesA), buildMerkleTree(filesB))); // [2]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (build)** | O(n) | Every leaf and internal node is hashed exactly once |
| **Time (compare)** | O(1) best case, O(log n) per differing leaf | Root mismatch is instant; each differing leaf costs one root-to-leaf walk |
| **Space** | O(n) | Every level of the tree is stored (roughly `2n` hashes total) |

Compare that to naive full comparison: O(n) time *and* O(n) data transferred, every single time. The Merkle Tree turns "check everything" into "check what changed."

---

## One Minute Insight

> **Hierarchy turns verification into a search problem.** Instead of checking every leaf, you check one root — and only descend where the truth disagrees.

This is the same idea behind checksums, version-control diffs, and even binary search: structure your data so that agreement can be confirmed in one glance, and disagreement can be localized without ever touching what already matches.

*Run `code.py` or `code.js` to see it in action.*
