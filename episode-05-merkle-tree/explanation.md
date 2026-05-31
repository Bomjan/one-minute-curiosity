# The Hash Tree That Powers Git, Bitcoin, and Your Database

Every time you run `git status`, a Merkle tree silently compares your working tree against the last commit — touching only the changed subtrees, skipping everything else. Most developers never think about why `git diff` is fast.

---

## The Problem

You have two massive datasets — say, two 10 GB database replicas on different servers. Are they in sync? If not, which blocks differ?

**The naive approach:** Compare every byte. That's 10 GB of data transferred across the network just to check.

**The question:** Can you find *exactly* which pieces differ while transferring only O(log n) data?

> Spoiler: yes — and the answer is a tree made of hashes.

---

## Example

```
Dataset A blocks:  ["tx1", "tx2", "tx3", "tx4"]
Dataset B blocks:  ["tx1", "TX2", "tx3", "tx4"]   ← block 1 was tampered

Merkle Tree A:
         ABCD
        /    \
      AB      CD
     /  \   /  \
   H(A) H(B) H(C) H(D)

Merkle Tree B:
         A'BCD          ← root differs → something changed
        /    \
      A'B     CD        ← left subtree differs
     /  \   /  \
  H(A) H(B') H(C) H(D)  ← only B' (index 1) changed
```

Two servers compare roots → mismatch → drill left → mismatch → drill to leaf 1 → found the difference. Only **3 comparisons** instead of 4, and this scales to **O(log n)** for any size.

---

## Why It Matters

| System | How it uses Merkle Trees |
| :--- | :--- |
| **Git** | Each commit stores a tree hash; `diff` finds changed subtrees without scanning all files |
| **Bitcoin / Ethereum** | Block headers contain a Merkle root; lightweight clients verify a single transaction with a short proof path |
| **Amazon DynamoDB** | Anti-entropy uses Merkle trees to sync replicas efficiently |
| **Apache Cassandra** | Detects diverged replicas during repair without full scans |
| **Certificate Transparency** | Logs use Merkle trees to prove certificate inclusion/non-tampering |
| **IPFS / Filecoin** | Content addressing is built on Merkle DAGs |

---

## Solution

### The Core Idea: Build Hashes Bottom-Up

1. Hash each data block → leaf nodes
2. Hash pairs of children together → parent nodes
3. Repeat until one root hash remains

Any change to a single leaf **bubbles up** and changes every ancestor hash all the way to the root. Two trees with the same root hash are identical (with cryptographic certainty).

### Finding Differences: Tree Traversal

To sync two trees:
1. Compare root hashes → same means identical, done
2. If different: recurse into left subtree, then right subtree
3. Stop recursing when hashes match (subtree is clean)
4. Leaf mismatch = found a dirty block

This is essentially a **diff over a hash tree** — only log(n) hashes need to travel over the network per changed block.

### Walkthrough

```
blocks = ["alpha", "beta", "gamma", "delta"]

Leaf hashes:
  H0 = sha256("alpha") = "abc..."
  H1 = sha256("beta")  = "def..."
  H2 = sha256("gamma") = "789..."
  H3 = sha256("delta") = "012..."

Level 1 (internal nodes):
  H01 = sha256(H0 + H1) = "zzz..."
  H23 = sha256(H2 + H3) = "yyy..."

Root:
  H_root = sha256(H01 + H23) = "xxx..."

Now change "beta" → "BETA":
  H1'    = sha256("BETA") ≠ H1
  H01'   = sha256(H0 + H1') ≠ H01
  H_root' = sha256(H01' + H23) ≠ H_root

Root changed → H23 unchanged → dirty block is in left half → H0 unchanged → dirty block is H1.
```

---

## Code

### Python

```python
import hashlib

def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

class MerkleTree:
    def __init__(self, blocks: list[str]):
        self.leaves = [sha256(b) for b in blocks]
        self.root = self._build(self.leaves)

    def _build(self, nodes: list[str]) -> str:
        if len(nodes) == 1:
            return nodes[0]
        # Duplicate last node if count is odd
        if len(nodes) % 2 == 1:
            nodes = nodes + [nodes[-1]]
        parents = [sha256(nodes[i] + nodes[i + 1]) for i in range(0, len(nodes), 2)]
        return self._build(parents)

def find_diff_indices(blocks_a: list[str], blocks_b: list[str]) -> list[int]:
    """Return indices of blocks that differ between two datasets."""
    hashes_a = [sha256(b) for b in blocks_a]
    hashes_b = [sha256(b) for b in blocks_b]
    return _diff(hashes_a, hashes_b, list(range(len(blocks_a))))

def _diff(ha: list[str], hb: list[str], indices: list[int]) -> list[int]:
    if len(ha) == 1:
        return indices if ha[0] != hb[0] else []
    if len(ha) % 2 == 1:
        ha, hb = ha + [ha[-1]], hb + [hb[-1]]
    mid = len(ha) // 2
    left  = _diff(ha[:mid], hb[:mid], indices[:mid])
    right = _diff(ha[mid:], hb[mid:], indices[mid:])
    return left + right


if __name__ == "__main__":
    blocks_a = ["tx1", "tx2", "tx3", "tx4"]
    blocks_b = ["tx1", "TX2", "tx3", "TX4"]  # indices 1 and 3 differ

    tree_a = MerkleTree(blocks_a)
    tree_b = MerkleTree(blocks_b)

    print("Root A:", tree_a.root[:16], "...")
    print("Root B:", tree_b.root[:16], "...")
    print("Match?", tree_a.root == tree_b.root)

    diffs = find_diff_indices(blocks_a, blocks_b)
    print("Differing block indices:", diffs)  # [1, 3]
```

### JavaScript

```javascript
const { createHash } = require("crypto");

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

class MerkleTree {
  constructor(blocks) {
    this.leaves = blocks.map(sha256);
    this.root = this._build(this.leaves);
  }

  _build(nodes) {
    if (nodes.length === 1) return nodes[0];
    if (nodes.length % 2 === 1) nodes = [...nodes, nodes.at(-1)];
    const parents = [];
    for (let i = 0; i < nodes.length; i += 2) {
      parents.push(sha256(nodes[i] + nodes[i + 1]));
    }
    return this._build(parents);
  }
}

function findDiffIndices(blocksA, blocksB) {
  const ha = blocksA.map(sha256);
  const hb = blocksB.map(sha256);
  return diff(ha, hb, blocksA.map((_, i) => i));
}

function diff(ha, hb, indices) {
  if (ha.length === 1) return ha[0] !== hb[0] ? indices : [];
  if (ha.length % 2 === 1) {
    ha = [...ha, ha.at(-1)];
    hb = [...hb, hb.at(-1)];
  }
  const mid = ha.length / 2;
  return [
    ...diff(ha.slice(0, mid), hb.slice(0, mid), indices.slice(0, mid)),
    ...diff(ha.slice(mid), hb.slice(mid), indices.slice(mid)),
  ];
}


const blocksA = ["tx1", "tx2", "tx3", "tx4"];
const blocksB = ["tx1", "TX2", "tx3", "TX4"]; // indices 1 and 3 differ

const treeA = new MerkleTree(blocksA);
const treeB = new MerkleTree(blocksB);

console.log("Root A:", treeA.root.slice(0, 16), "...");
console.log("Root B:", treeB.root.slice(0, 16), "...");
console.log("Match?", treeA.root === treeB.root);
console.log("Differing block indices:", findDiffIndices(blocksA, blocksB)); // [1, 3]
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Build time** | O(n) — hash every block and each internal node once |
| **Build space** | O(n) — store all leaf and internal hashes |
| **Root comparison** | O(1) — one hash comparison |
| **Diff (k changed blocks)** | O(k log n) — navigate O(log n) tree levels per dirty block |

The payoff is in the diff: comparing two 1 million-block datasets with 3 changed blocks costs **~60 hash comparisons**, not 1,000,000.

---

## One Minute Insight

> **Hashing is not just about security — it's about summarization.** A single hash can represent the state of an entire dataset. A tree of hashes lets you pinpoint *where* the state diverged in logarithmic time.

This is why `git diff` feels instant even on large repos, why Bitcoin nodes can verify a transaction without downloading the entire blockchain, and why distributed databases can repair themselves without full table scans. The Merkle tree is proof that the right data structure doesn't just store data — it makes entire categories of problem trivially efficient.

*Run `code.py` or `code.js` to see the tree compare two datasets and pinpoint the dirty blocks.*
