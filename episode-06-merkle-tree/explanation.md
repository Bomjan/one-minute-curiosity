# The Tree That Catches Liars

One hash at the top of a tree is enough to prove that not a single byte, anywhere below it, has been touched.

---

## The Problem

You're syncing a 10 GB file from a thousand strangers on a peer-to-peer network, or checking that a database replica on the other side of the world still matches its primary. Comparing everything byte-by-byte would mean transferring the *entire* dataset just to check it — which defeats the purpose of checking in the first place.

Think of it like a company rumor chain: every manager summarizes the reports of the people below them into one line, and passes that summary up. The CEO never reads every report — but if the final summary matches what's expected, *every single report beneath it* must be exactly right, because any change downstream would have rippled up and changed the summary too.

That's the idea behind a **Merkle tree**: hash every data block, then hash pairs of hashes together, layer by layer, until you're left with one hash — the **Merkle root**. Change one bit anywhere in the data, and the root changes completely.

---

## Example

Four blocks: `["A", "B", "C", "D"]`

```
Leaves:   H(A)      H(B)      H(C)      H(D)
             \       /           \       /
Level 1:    H(H(A)+H(B))       H(H(C)+H(D))
                     \             /
Root:            H( H(AB) + H(CD) )
```

```
Merkle Root: 50a504831bd50fee3581d287168a85a8dcdd6aa777ffd0fe35e37290268a0153
```

Now flip a single bit — change `"D"` to `"d"` — and recompute. The root becomes a completely different string, even though 3 of the 4 blocks never changed. That's the tamper-detection property in action.

Better yet: to prove block `"B"` is really part of this tree, you don't need `A`, `C`, or `D` at all. You just need **2 sibling hashes** (`H(A)` and `H(CD)`) — a *Merkle proof* — to walk back up to the same root.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Version control** | Git identifies every commit, tree, and blob by a hash built the same way — that's why a changed file always changes the commit hash |
| **Distributed databases** | Cassandra and DynamoDB compare Merkle roots between replicas to find *which* rows drifted, without scanning every row |
| **Blockchain** | Bitcoin's block header stores only the Merkle root of thousands of transactions — light clients verify one transaction with a tiny proof, not the whole chain |
| **P2P file sharing** | BitTorrent verifies each downloaded piece against a known root before accepting it from an untrusted peer |
| **Security & auditing** | Certificate Transparency logs use Merkle trees so anyone can verify a certificate was logged, without downloading the entire log |

The pattern underneath all of these: **verify a huge amount of data using a tiny, fixed-size fingerprint, and pinpoint exactly what changed in logarithmic time.**

---

## Solution

### Building the tree

1. Hash every block — these become the **leaves**.
2. Pair adjacent hashes and hash them together to form the next level up. If a level has an odd number of nodes, duplicate the last one so it can pair with itself.
3. Repeat until only one hash remains: the **root**.

### Proving membership without the full dataset

To prove a single leaf belongs, you don't replay the whole build. You just need the **sibling hash at each level** along the path from that leaf to the root:

```
Prove "B" (index 1):
  Level 0 sibling: H(A)         → combine as H(A) + H(B)
  Level 1 sibling: H(CD)        → combine as H(AB) + H(CD)
  Result should equal the known root
```

A verifier who only has the block, the proof, and the trusted root can recompute the root in `O(log n)` hashing steps — no need to ever see `A`, `C`, or `D`.

### Walkthrough of the index math

At each level, a node's sibling is found by flipping its lowest bit (`index XOR 1`) — even indices pair with the node right after them, odd indices pair with the node right before them. After combining, the index for the next level up is simply `index // 2`. That's the entire proof algorithm.

---

## Code

### Python

```python
import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Build every level of the tree, from leaves up to the root."""
    level = [_hash(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate the odd one out
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to rebuild the root from a single leaf."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        sibling_index = index ^ 1  # flip the last bit: left <-> right
        proof.append(level[sibling_index])
        index //= 2
    return proof


def verify_proof(block, proof, root, index):
    current = _hash(block)
    for sibling in proof:
        current = _hash(current + sibling) if index % 2 == 0 else _hash(sibling + current)
        index //= 2
    return current == root


if __name__ == "__main__":
    blocks = ["A", "B", "C", "D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print("Merkle Root:", root)

    # Prove block "B" (index 1) belongs, without ever sending A, C, or D
    proof = get_proof(tree, 1)
    print("Valid proof:  ", verify_proof("B", proof, root, 1))  # True
    print("Tampered block:", verify_proof("X", proof, root, 1))  # False
```

### JavaScript

```javascript
const crypto = require('crypto');

const hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

function buildMerkleTree(blocks) {
    // Build every level of the tree, from leaves up to the root.
    let level = blocks.map(hash);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]]; // duplicate the odd one out
        level = Array.from({ length: level.length / 2 }, (_, i) => hash(level[2 * i] + level[2 * i + 1]));
        tree.push(level);
    }

    return tree;
}

function getProof(tree, index) {
    // Sibling hashes needed to rebuild the root from a single leaf.
    const proof = [];
    for (const rawLevel of tree.slice(0, -1)) {
        const level = rawLevel.length % 2 === 1 ? [...rawLevel, rawLevel[rawLevel.length - 1]] : rawLevel;
        const siblingIndex = index ^ 1; // flip the last bit: left <-> right
        proof.push(level[siblingIndex]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(block, proof, root, index) {
    let current = hash(block);
    for (const sibling of proof) {
        current = index % 2 === 0 ? hash(current + sibling) : hash(sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

// Demo
const blocks = ['A', 'B', 'C', 'D'];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log('Merkle Root:', root);

// Prove block "B" (index 1) belongs, without ever sending A, C, or D
const proof = getProof(tree, 1);
console.log('Valid proof:   ', verifyProof('B', proof, root, 1));  // true
console.log('Tampered block:', verifyProof('X', proof, root, 1)); // false
```

---

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| **Build tree** | O(n) | O(n) | Every block is hashed once, and each level halves in size, so total work across all levels is still linear |
| **Generate/verify proof** | O(log n) | O(log n) | The proof only needs one sibling hash per level, and the tree has `log₂ n` levels |

Compare that to naively re-downloading and re-hashing the entire dataset to check one block — that's O(n) just to verify a single piece. A Merkle proof turns that into a handful of hashes.

---

## One Minute Insight

> **You don't need to see everything to prove nothing changed — you just need enough hashes to retrace the path to the top.**

That's the quiet trick behind Git noticing a single edited file, Bitcoin nodes trusting transactions they've never downloaded, and databases finding the one row that fell out of sync across a continent. A tiny fixed-size fingerprint at the root carries the tamper-evidence of everything beneath it.

*Run `code.py` or `code.js` to see it in action.*
