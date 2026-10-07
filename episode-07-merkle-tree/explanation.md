# The Fingerprint Tree

Two databases hold a million records each. Exactly one row differs. How do you find it without sending a million rows over the network?

---

## The Problem

Imagine two librarians in different cities, each with an identical 1,000,000-page encyclopedia. Someone scribbles a typo on one page. Mailing every page to compare is absurd.

Instead, each librarian writes a *fingerprint* of each chapter, then a fingerprint of the fingerprints, and so on up to one fingerprint for the whole book. Compare the top one. If it differs, compare the two halves. Follow the mismatch down. A typo in a million pages is found in about **20 comparisons**.

That structure is a **Merkle tree**.

---

## Example

```
Replica A: 1000 records
Replica B: same, but records 7 and 421 were changed

find_diffs(A, A) -> []          # root hashes match: 1 comparison
find_diffs(A, B) -> [7, 421]    # only mismatching branches explored
```

---

## Why It Matters

| Domain | Where it shows up |
| :--- | :--- |
| **Distributed databases** | Cassandra and DynamoDB-style systems use it for anti-entropy repair between replicas |
| **Version control** | Git's object model is a Merkle DAG: same hash, same content |
| **Blockchains** | Prove a transaction is in a block with `O(log n)` hashes |
| **Package & file sync** | Detect which chunks changed without transferring the rest |
| **Security** | Certificate Transparency logs rely on Merkle proofs |

---

## Solution

### The Key Insight

A hash summarises data: change one byte and the hash changes completely. So hash the hash of two children together, and a parent's hash summarises *everything beneath it*.

### Walkthrough

1. **Hash every record** to get the leaves.
2. **Pair neighbours**, hash `left + right`, to build the next level. If a level has an odd count, duplicate the last node.
3. Repeat until one **root** remains.
4. **Compare roots.** Equal means the data is identical. Done.
5. If not equal, compare each child pair and **only descend into mismatching nodes**.
6. Mismatches that reach the leaf level are the differing records.

```
        root
       /    \
    H(AB)   H(CD)      <- only the branch with a mismatch is explored
    /  \    /  \
  H(A) H(B) H(C) H(D)
```

---

## Code

### Python

```python
import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(records):
    """Return tree levels: levels[0] = leaf hashes, levels[-1] = [root]."""
    level = [h(r.encode()) for r in records]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def find_diffs(a, b):
    """Indices of leaves that differ, comparing hashes top-down."""
    ta, tb = build_tree(a), build_tree(b)
    if ta[-1] == tb[-1]:
        return []  # one comparison: replicas are identical

    frontier = [0]  # start at the root, index 0
    for depth in range(len(ta) - 2, -1, -1):
        next_frontier = []
        for i in frontier:
            for child in (2 * i, 2 * i + 1):
                if child < len(ta[depth]) and ta[depth][child] != tb[depth][child]:
                    next_frontier.append(child)
        frontier = next_frontier
    return [i for i in frontier if i < len(a)]


if __name__ == "__main__":
    replica_a = [f"user:{i}:balance=100" for i in range(1000)]
    replica_b = list(replica_a)
    replica_b[421] = "user:421:balance=999"
    replica_b[7] = "user:7:balance=0"

    print(find_diffs(replica_a, replica_a))  # []
    print(find_diffs(replica_a, replica_b))  # [7, 421]
```

### JavaScript

```javascript
const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildTree(records) {
  let level = records.map((r) => h(r));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // odd: duplicate last
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.concat([level[i], level[i + 1]])));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

function findDiffs(a, b) {
  const ta = buildTree(a);
  const tb = buildTree(b);
  const top = ta.length - 1;
  if (ta[top][0].equals(tb[top][0])) return []; // one comparison: identical

  let frontier = [0]; // start at the root, index 0
  for (let depth = top - 1; depth >= 0; depth--) {
    const next = [];
    for (const i of frontier) {
      for (const child of [2 * i, 2 * i + 1]) {
        if (child < ta[depth].length && !ta[depth][child].equals(tb[depth][child])) {
          next.push(child);
        }
      }
    }
    frontier = next;
  }
  return frontier.filter((i) => i < a.length);
}

const replicaA = Array.from({ length: 1000 }, (_, i) => `user:${i}:balance=100`);
const replicaB = [...replicaA];
replicaB[421] = "user:421:balance=999";
replicaB[7] = "user:7:balance=0";

console.log(findDiffs(replicaA, replicaA)); // []
console.log(findDiffs(replicaA, replicaB)); // [ 7, 421 ]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) to build, O(k log n) to locate `k` differences | Building hashes every record once; the walk only follows mismatching paths |
| **Space** | O(n) | The tree stores about 2n hashes |

In a real system each replica keeps its tree and only exchanges the mismatching nodes, so the *network* cost is `O(k log n)`. The demo builds both trees locally for simplicity.

---

## One Minute Insight

> **Don't compare the data, compare its fingerprint, then recurse only where fingerprints disagree.**

Merkle trees turn "are these two huge things equal?" into one comparison, and "where do they differ?" into a logarithmic search. Whenever systems need to agree cheaply, a tree of hashes is usually hiding underneath.

*Run `code.py` or `code.js` to see it in action.*
