# Proving a File Is in a Million-File Set With 20 Hashes

How do you prove one item belongs to a huge collection without sending the collection? Stack hashes into a tree and send only the path.

---

## The Problem

You trust a server to store 1,000,000 files. It hands you one tiny **fingerprint** of the whole set. Later you ask: *"Is `report.pdf` really in there, unchanged?"*

Re-downloading everything is absurd. Hashing everything again is just as slow. Yet git, Bitcoin, Cassandra and Certificate Transparency all answer this question in **milliseconds**.

Analogy: a tournament bracket. To prove your team reached the final, you don't replay every match. You show only the opponents you beat on your path.

---

## Example

```
4 files: A B C D

        Root = H(H(AB) + H(CD))
        /                     \
    H(AB)                    H(CD)
    /    \                   /    \
  H(A)  H(B)              H(C)  H(D)

Prove C is in the set. Send just:  [H(D), H(AB)]

verify:  H(C) + H(D)  -> H(CD)
         H(AB) + H(CD) -> Root   ✓ matches the trusted fingerprint
```

```
1000 files -> proof is 10 hashes (320 bytes)
Tamper with one character of the file -> verification fails
```

---

## Why It Matters

This is a **Merkle tree**, and it quietly holds up a lot of infrastructure:

| Domain | Use |
| :--- | :--- |
| **Version control** | Git's object model is Merkle-style: change one file and every parent hash changes |
| **Blockchains** | Light wallets verify a transaction without downloading the block |
| **Databases** | Cassandra and DynamoDB compare replicas by exchanging tree hashes, then descend only into the differing branches |
| **Cybersecurity** | Certificate Transparency logs prove a certificate was logged |
| **Package managers** | Tamper-evident registries and content-addressed storage |

---

## Solution

### The Key Insight: A Parent Commits to Its Children

A hash changes completely if any input bit changes. So if each parent is the hash of its two children, the **root depends on every leaf**.

To check one leaf you don't need the other leaves. You only need, at each level, the **sibling hash** of the node you are on. Recompute upward and compare with the trusted root.

### Step-by-Step Walkthrough

1. **Hash each item** to make the leaves.
2. **Pair neighbours** and hash each pair into a parent. If a level has an odd count, duplicate the last node.
3. **Repeat** until one hash remains: the root. Publish only this.
4. **Prove leaf `i`**: at every level, record its sibling (and whether it sits left or right).
5. **Verify**: hash the item, fold in each sibling in order, compare with the root.

One detail that matters for security: hash leaves and inner nodes with **different prefixes** (`leaf:` / `node:`). Otherwise an attacker can pass an inner node off as a leaf.

---

## Code

### Python

```python
import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_levels(items):
    """Return every tree level, leaves first, root last."""
    level = [h(b"leaf:" + x.encode()) for x in items]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(b"node:" + level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def prove(levels, index):
    """Collect the sibling hash at each level: log2(n) hashes in total."""
    proof = []
    for level in levels[:-1]:
        if len(level) % 2:
            level = level + [level[-1]]
        sibling = index ^ 1
        proof.append((level[sibling], sibling < index))  # (hash, sibling_is_left)
        index //= 2
    return proof


def verify(item, proof, root):
    node = h(b"leaf:" + item.encode())
    for sibling, sibling_is_left in proof:
        pair = sibling + node if sibling_is_left else node + sibling
        node = h(b"node:" + pair)
    return node == root


if __name__ == "__main__":
    files = [f"file-{i}.txt" for i in range(1000)]
    levels = build_levels(files)
    root = levels[-1][0]

    proof = prove(levels, 437)
    print(len(proof))                          # 10 hashes for 1000 files
    print(verify("file-437.txt", proof, root))  # True
    print(verify("file-437.TXT", proof, root))  # False
```

### JavaScript

```javascript
const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildLevels(items) {
    // Prefixes keep leaf hashes and node hashes in separate domains
    let level = items.map((x) => h(Buffer.concat([Buffer.from("leaf:"), Buffer.from(x)])));
    const levels = [level];
    while (level.length > 1) {
        if (level.length % 2) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(h(Buffer.concat([Buffer.from("node:"), level[i], level[i + 1]])));
        }
        level = next;
        levels.push(level);
    }
    return levels;
}

function prove(levels, index) {
    const proof = [];
    for (const original of levels.slice(0, -1)) {
        const level = original.length % 2 ? [...original, original[original.length - 1]] : original;
        const sibling = index ^ 1;
        proof.push({ hash: level[sibling], isLeft: sibling < index });
        index = Math.floor(index / 2);
    }
    return proof;
}

function verify(item, proof, root) {
    let node = h(Buffer.concat([Buffer.from("leaf:"), Buffer.from(item)]));
    for (const { hash, isLeft } of proof) {
        const pair = isLeft ? [hash, node] : [node, hash];
        node = h(Buffer.concat([Buffer.from("node:"), ...pair]));
    }
    return node.equals(root);
}

const files = Array.from({ length: 1000 }, (_, i) => `file-${i}.txt`);
const levels = buildLevels(files);
const root = levels[levels.length - 1][0];

const proof = prove(levels, 437);
console.log(proof.length);                          // 10 hashes for 1000 files
console.log(verify("file-437.txt", proof, root));   // true
console.log(verify("file-437.TXT", proof, root));   // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | Build O(n), prove O(log n), verify O(log n) | The tree has about 2n nodes; a proof walks one root-to-leaf path |
| **Space** | O(n) to store the tree, O(log n) per proof | A proof is one hash per level, so 1M files need about 20 hashes |

---

## One Minute Insight

> **Don't compare the data, compare the fingerprints, and only descend where they differ.**

A single root hash turns "trust everything" into "verify anything". Whenever two systems must agree on big data cheaply, a Merkle tree is usually hiding nearby.

*Run `code.py` or `code.js` to see it in action.*
