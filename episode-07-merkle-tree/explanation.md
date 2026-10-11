# The Fingerprint of a Million Files

One 32-byte hash can vouch for a million files, and it can point to the single corrupted one in about 20 steps.

---

## The Problem

You store a huge file across many servers. A bit rots on one of them. How do you find which block went bad, **without re-downloading everything**?

Think of a company org chart where every manager signs off on the combined signatures of their reports. If the CEO's signature changes, someone below changed something. Follow the mismatched signatures down and you land on the culprit.

That structure is a **Merkle tree**: leaves are hashes of data blocks, and every parent is the hash of its two children.

---

## Example

```
blocks: [b0, b1, b2, b3, b4, b5, b6, b7]
b5 is silently corrupted on replica B.

Compare roots          -> differ         (1 comparison)
Compare children       -> right differs  (2 comparisons)
Compare grandchildren  -> left differs   (2 comparisons)
Compare leaves         -> b5             found!

Proof that b5 is in the tree: 3 sibling hashes (log2 8)
```

---

## Why It Matters

- **Git** identifies every commit and tree with this idea.
- **Bitcoin** uses it so light clients can verify a transaction without downloading a block.
- **Cassandra and DynamoDB** use it to sync replicas (anti-entropy repair).
- **BitTorrent, IPFS, and certificate transparency logs** use it to verify pieces from untrusted peers.

---

## Solution

1. **Hash every block** to make the leaves.
2. **Pair them up** and hash each pair. Duplicate the last node if the count is odd.
3. **Repeat** until one hash remains: the root.

Two datasets are identical if their roots match. If they differ, descend only into the child whose hash differs, ignoring the matching half. That's a binary search over your data.

**Membership proof:** to prove one block belongs to a tree, send only its siblings along the path to the root. The verifier re-hashes upward and compares against the trusted root.

---

## Code

See [`code.py`](./code.py) and [`code.js`](./code.js). Run either one directly:

```bash
python code.py
node code.js
```

Core idea (Python):

```python
level = [h(b) for b in blocks]
while len(level) > 1:
    if len(level) % 2:
        level = level + [level[-1]]
    level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
```

---

## Complexity

| Operation | Time | Space |
| :--- | :--- | :--- |
| Build tree | O(n) | O(n) |
| Find a differing block | O(log n) hash comparisons once trees exist | O(1) extra |
| Membership proof / verify | O(log n) | O(log n) |

---

## One Minute Insight

> Don't compare the data. Compare a summary of the data, then only dig where the summaries disagree.

Trust scales logarithmically when you hash in a tree.
