# The Data Structure That Flips Coins to Stay Balanced

Balanced trees stay balanced through strict bookkeeping — rotations, color flips, rebalance rules. Skip Lists throw that rulebook away and use **randomness** instead. The wild part: it works just as well, and it's dramatically easier to build.

---

## The Problem

A sorted linked list is easy to build but terrible to search — you're stuck walking node by node, one at a time, until you find your target. That's **O(n)**.

Balanced binary search trees fix this (**O(log n)**), but at a cost: every insert or delete can trigger rotations, height tracking, and rebalancing logic that's notoriously easy to get wrong.

**The question:** can you get tree-like O(log n) search on a *sorted list*, without any of the rebalancing machinery?

---

## Example

Picture a sorted list: `3 → 6 → 7 → 9 → 12 → 17 → 19 → 21 → 25 → 26`

Searching for `19` the plain way takes 7 hops.

Now add "express lanes" above the base list — shortcuts that skip over several nodes at once:

```
Level 2:  3 -------------------> 19 -------------> 26
Level 1:  3 -------> 9 -------> 19 -------> 25 --> 26
Level 0:  3 -> 6 -> 7 -> 9 -> 12 -> 17 -> 19 -> 21 -> 25 -> 26
```

Searching for `19` now: start at Level 2, jump straight to `19` in **1 hop** instead of 7. That's the whole idea.

---

## Why It Matters

Skip Lists aren't a classroom curiosity — they're running in production right now:

| Domain | Real-World Use |
| :--- | :--- |
| **Databases** | Redis's `ZSET` (sorted sets) is a skip list under the hood |
| **Storage engines** | LevelDB and RocksDB use skip lists for in-memory memtables |
| **Concurrency** | Skip lists support lock-free, wait-free concurrent inserts far more easily than trees |
| **Distributed systems** | Ordered, mergeable structures used in log/version storage |
| **Competitive programming** | A drop-in substitute for a balanced BST when you don't trust yourself to implement AVL rotations under time pressure |

The deeper lesson: **you don't need a strict invariant to guarantee balance — a good probability distribution can guarantee it "in expectation," and that's often good enough.**

---

## Solution

### The Key Insight: Let a Coin Flip Decide the Structure

Every node starts at level 0 (the full sorted list). When a node is inserted, flip a coin:

- **Heads** → promote the node to the next level up, flip again.
- **Tails** → stop.

Roughly half of nodes reach level 1, a quarter reach level 2, an eighth reach level 3, and so on — a geometric distribution. No rebalancing needed: the *probabilities themselves* keep the structure shaped like a balanced tree.

### Step-by-Step Walkthrough

**Search** for a value:
1. Start at the top-left corner (highest level, head of the list).
2. Move right as long as the next node's value is less than the target.
3. When you can't move right anymore, drop down one level and repeat.
4. Stop at level 0 — you're either standing on the target or it doesn't exist.

**Insert** a value:
1. Do the same search, but remember the rightmost node you touched at each level (`update[]`).
2. Flip coins to decide how many levels the new node should span.
3. Splice the new node into every level it was promoted to, using the remembered pointers.

No rotations. No height tracking. Just pointers and a random number generator.

---

## Code

### Python

```python
import random


class SkipListNode:
    def __init__(self, value, level):
        self.value = value
        self.forward = [None] * (level + 1)


class SkipList:
    def __init__(self, max_level=16, p=0.5):
        self.max_level = max_level
        self.p = p
        self.level = 0
        self.head = SkipListNode(None, max_level)

    def _random_level(self):
        # Keep "flipping heads" to climb levels, capped at max_level
        level = 0
        while random.random() < self.p and level < self.max_level:
            level += 1
        return level

    def insert(self, value):
        update = [self.head] * (self.max_level + 1)
        current = self.head

        # Walk down from the top, remembering the last node touched per level
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
            update[i] = current

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.head
            self.level = new_level

        node = SkipListNode(value, new_level)
        for i in range(new_level + 1):
            node.forward[i] = update[i].forward[i]
            update[i].forward[i] = node

    def search(self, value):
        current = self.head
        hops = 0

        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
                hops += 1

        current = current.forward[0]
        hops += 1
        found = current is not None and current.value == value
        return found, hops


if __name__ == "__main__":
    sl = SkipList()
    for v in [3, 6, 7, 9, 12, 19, 17, 26, 21, 25]:
        sl.insert(v)

    found, hops = sl.search(19)
    print(f"Search 19 -> found={found}, hops={hops}")

    found, hops = sl.search(15)
    print(f"Search 15 -> found={found}, hops={hops}")
```

### JavaScript

```javascript
class SkipListNode {
    constructor(value, level) {
        this.value = value;
        this.forward = new Array(level + 1).fill(null);
    }
}

class SkipList {
    constructor(maxLevel = 16, p = 0.5) {
        this.maxLevel = maxLevel;
        this.p = p;
        this.level = 0;
        this.head = new SkipListNode(null, maxLevel);
    }

    _randomLevel() {
        // Keep "flipping heads" to climb levels, capped at maxLevel
        let level = 0;
        while (Math.random() < this.p && level < this.maxLevel) level++;
        return level;
    }

    insert(value) {
        const update = new Array(this.maxLevel + 1).fill(this.head);
        let current = this.head;

        // Walk down from the top, remembering the last node touched per level
        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
            }
            update[i] = current;
        }

        const newLevel = this._randomLevel();
        if (newLevel > this.level) {
            for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.head;
            this.level = newLevel;
        }

        const node = new SkipListNode(value, newLevel);
        for (let i = 0; i <= newLevel; i++) {
            node.forward[i] = update[i].forward[i];
            update[i].forward[i] = node;
        }
    }

    search(value) {
        let current = this.head;
        let hops = 0;

        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
                hops++;
            }
        }

        current = current.forward[0];
        hops++;
        const found = current !== null && current.value === value;
        return { found, hops };
    }
}

const sl = new SkipList();
[3, 6, 7, 9, 12, 19, 17, 26, 21, 25].forEach((v) => sl.insert(v));

console.log("Search 19 ->", sl.search(19));
console.log("Search 15 ->", sl.search(15));
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(log n) expected | Each level roughly halves the remaining search space, like a coin-flip binary search |
| **Space** | O(n) expected | The geometric level distribution means the *total* nodes across all levels sums to O(n), not O(n log n) |

Unlike a balanced tree, there's no worst-case guarantee — an unlucky run of coin flips could degrade toward O(n). In practice, with enough insertions, the probabilities average out so reliably that production databases bet on it daily.

---

## One Minute Insight

> **You don't have to enforce balance — you can bet on it.** A skip list trades deterministic invariants (rotations, color rules) for a probabilistic guarantee that holds "with high probability" and is far simpler to implement and reason about.

This is the same trade-off behind hash tables, randomized quicksort, and Bloom filters: give up a worst-case guarantee, gain massive simplicity and great average-case performance. Sometimes the best engineering decision is to let chance do the hard work for you.

*Run `code.py` or `code.js` to see it in action.*
