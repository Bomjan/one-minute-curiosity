# The Tree That Finds One Bad Byte in a Billion

Git, BitTorrent, and Amazon's DynamoDB all share a secret weapon for spotting corruption without comparing every byte: a tree made entirely of hashes.

---

## The Problem

Two servers each hold a copy of the same 1,000,000-file dataset. One file, somewhere, got corrupted during a sync. How do you find *which file* differs — without downloading and comparing all 1,000,000 files?

Hashing the whole dataset into one giant checksum tells you *if* something differs, but not *where*. You'd still have to compare every file individually to locate the bad one.

**Can you pinpoint the corrupted file while only exchanging a handful of hashes?**

Yes — with a **Merkle tree**: hash every block individually, then hash pairs of hashes together, layer by layer, up to a single root hash. Two datasets are identical if and only if their root hashes match. And when they don't match, you can walk down the tree — comparing only the branches that disagree — to pinpoint the exact block that changed.

---

## Example

```
Blocks A: [alpha, bravo, charlie, delta,           echo, foxtrot, golf, hotel]
Blocks B: [alpha, bravo, charlie, DELTA-CORRUPTED, echo, foxtrot, golf, hotel]

Leaf hashes:   h0    h1    h2    h3*    h4    h5    h6    h7      (h3 differs, rest match)

Level 1:          h01        h23*          h45         h67        (only h23 differs)
Level 2:                 h0123*                    h4567          (only h0123 differs)
Root:                            ROOT*                             (mismatch -> corruption exists)

Walking down from the root, only the h0123* branch is ever explored.
h4567 matches instantly, so its entire half of the dataset -- 4 files --
is skipped without a single comparison.

Result: mismatched block index -> 3
```

---

## Why It Matters

Merkle trees quietly power some of the most widely used systems in software:

| Domain | Use Case |
| :--- | :--- |
| **Version control** | Git identifies changed files by comparing tree hashes, not file contents |
| **Distributed databases** | Cassandra and DynamoDB use Merkle trees for anti-entropy repair between replicas |
| **Peer-to-peer networks** | BitTorrent verifies each downloaded chunk against a hash tree before trusting it |
| **Blockchain** | A block's transactions are summarized into one Merkle root, so a light client can verify a single transaction without downloading the whole chain |
| **Cybersecurity** | Certificate Transparency logs use Merkle trees so anyone can audit a log without downloading every certificate ever issued |

The underlying idea — **summarize, compare summaries, only recurse where they disagree** — turns an O(n) comparison problem into something close to O(log n) whenever differences are rare.

---

## Solution

### The Insight: Hash Pyramids

Instead of one hash for the whole dataset, build a *pyramid* of hashes:

1. **Leaves**: hash each data block individually.
2. **Parents**: hash the concatenation of each pair of child hashes.
3. **Repeat** until only one hash remains — the **root**.

If two datasets are identical, every level of their pyramids matches, including the root. If a single block changes, its hash changes — and so does every hash directly above it, all the way to the root. But hashes on the *other* side of the tree, untouched by the change, stay exactly the same.

### The Walkthrough

To compare two datasets:

1. Compare the two root hashes. If they match, the datasets are identical — done, in one comparison.
2. If they don't match, compare their two children's hashes.
3. For any pair of child hashes that already match, **stop** — that entire subtree is guaranteed identical.
4. For any pair that doesn't match, recurse into its children.
5. Repeat until you reach mismatched leaves — those are your corrupted blocks.

Each mismatch "pulls" you down exactly one path from root to leaf, while every matching sibling is pruned instantly.

---

## Code

### Python

```python
import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Build a Merkle tree from data blocks. Returns levels bottom-up: [leaves, ..., root]."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate lone leaf
            next_level.append(_hash(left + right))
        level = next_level
        tree.append(level)
    return tree


def merkle_root(leaves):
    return build_merkle_tree(leaves)[-1][0]


def find_mismatches(leaves_a, leaves_b):
    """Return indices of blocks that differ between two equal-length datasets,
    skipping every subtree whose hash already matches."""
    tree_a = build_merkle_tree(leaves_a)
    tree_b = build_merkle_tree(leaves_b)
    top = len(tree_a) - 1

    if tree_a[top][0] == tree_b[top][0]:
        return []

    mismatched = []

    def walk(level, index):
        hash_a = tree_a[level][index]
        hash_b = tree_b[level][index]
        if hash_a == hash_b:
            return  # entire subtree is identical, no need to look deeper
        if level == 0:
            mismatched.append(index)
            return
        walk(level - 1, index * 2)
        walk(level - 1, index * 2 + 1)

    walk(top, 0)
    return mismatched


if __name__ == "__main__":
    blocks_a = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"]
    blocks_b = ["alpha", "bravo", "charlie", "DELTA-CORRUPTED", "echo", "foxtrot", "golf", "hotel"]

    print("Root A:", merkle_root(blocks_a))
    print("Root B:", merkle_root(blocks_b))
    print("Mismatched block indices:", find_mismatches(blocks_a, blocks_b))  # [3]
    print("Identical dataset mismatches:", find_mismatches(blocks_a, blocks_a))  # []
```

### JavaScript

```javascript
const crypto = require('crypto');

function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function buildMerkleTree(leaves) {
    // Build a Merkle tree from data blocks. Returns levels bottom-up: [leaves, ..., root].
    let level = leaves.map(hash);
    const tree = [level];
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate lone leaf
            next.push(hash(left + right));
        }
        level = next;
        tree.push(level);
    }
    return tree;
}

function merkleRoot(leaves) {
    const tree = buildMerkleTree(leaves);
    return tree[tree.length - 1][0];
}

function findMismatches(leavesA, leavesB) {
    // Return indices of blocks that differ between two equal-length datasets,
    // skipping every subtree whose hash already matches.
    const treeA = buildMerkleTree(leavesA);
    const treeB = buildMerkleTree(leavesB);
    const top = treeA.length - 1;

    if (treeA[top][0] === treeB[top][0]) return [];

    const mismatched = [];

    function walk(level, index) {
        const hashA = treeA[level][index];
        const hashB = treeB[level][index];
        if (hashA === hashB) return; // entire subtree is identical, no need to look deeper
        if (level === 0) {
            mismatched.push(index);
            return;
        }
        walk(level - 1, index * 2);
        walk(level - 1, index * 2 + 1);
    }

    walk(top, 0);
    return mismatched;
}

const blocksA = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
const blocksB = ['alpha', 'bravo', 'charlie', 'DELTA-CORRUPTED', 'echo', 'foxtrot', 'golf', 'hotel'];

console.log('Root A:', merkleRoot(blocksA));
console.log('Root B:', merkleRoot(blocksB));
console.log('Mismatched block indices:', findMismatches(blocksA, blocksB)); // [3]
console.log('Identical dataset mismatches:', findMismatches(blocksA, blocksA)); // []
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Build** | O(n) | Every block is hashed once; the pyramid has O(n) total nodes |
| **Compare (k mismatches)** | O(k log(n/k)) | Only paths from root to actual differences are ever visited |
| **Compare (identical data)** | O(1) | A single root hash comparison confirms equality |
| **Space** | O(n) | The tree stores one hash per node across all levels |

Compare that to the naive approach — comparing all n blocks pairwise — which is always O(n), even when only one block differs.

---

## One Minute Insight

> **Don't compare the data — compare summaries of the data, recursively.** A Merkle tree turns "are these two million-item datasets the same?" into a handful of hash comparisons, because a mismatch anywhere is guaranteed to bubble up to a mismatched root, and a match anywhere lets you skip an entire branch. It's the same instinct behind diffing, cache invalidation, and database checksums: verify the summary first, and only pay for detail where it's actually needed.

*Run `code.py` or `code.js` to see it in action.*
