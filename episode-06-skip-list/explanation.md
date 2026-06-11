# Skip the Line: How Redis Searches Sorted Data Without Balancing a Tree

A coin flip decides who gets to be the express lane. That's the entire secret behind one of the most elegant data structures in production databases.

---

## The Problem

You have a **sorted linked list** of a million numbers. You need to find a value, insert one, or delete one — fast.

A plain linked list gives you O(n) search: you crawl node by node, one at a time, like checking every single stop on a local train.

Balanced trees (AVL, Red-Black) solve this in O(log n), but they're notoriously fiddly — rotations, rebalancing, edge cases on every insert and delete.

**Is there a way to get O(log n) search on a linked list, without any rebalancing logic at all?**

Turns out: yes. Add "express lanes" on top of your list, and decide who joins each lane... with a coin flip.

---

## Example

```
Level 3:  1 ----------------------------> 19 ------------> NULL
Level 2:  1 ------> 6 -------------------> 19 ------------> NULL
Level 1:  1 ------> 6 ------> 9 --------> 19 ------> 25 ---> NULL
Level 0:  1 -> 3 -> 6 -> 7 -> 9 -> 12 -> 17 -> 19 -> 21 -> 25 -> 26 -> NULL

search(19):
  Level 3: 1 -> 19  (found a match early, drop down)
  Level 0: confirm 19 == 19 ✓

Total hops: 2  (instead of 8 on a plain list)
```

Like a subway map: express trains skip stations, but you can always step down to the local line to reach an exact stop.

---

## Why It Matters

Skip lists power real, high-throughput systems precisely *because* they avoid rebalancing:

| System | Use of Skip Lists |
| :--- | :--- |
| **Redis** | Sorted Sets (`ZSET`) are implemented with skip lists |
| **LevelDB / RocksDB** | In-memory "memtable" uses a skip list for ordered writes |
| **Lucene / search engines** | Skip pointers accelerate posting-list intersection |
| **Concurrent data structures** | Skip lists are easier to make lock-free than trees (no rotations to coordinate) |

The deeper lesson: **probabilistic balance can replace structural balance.** Instead of guaranteeing perfect height with rotations, you guarantee *expected* O(log n) height through randomness — and the math works out almost every time.

---

## Solution

### The Key Insight: Randomized Express Lanes

Every node lives on level 0 (the full list). When you insert a node, flip a coin:

- **Heads** → also add it to level 1, flip again
- **Heads again** → also add it to level 2, flip again
- **Tails** → stop promoting

On average, half the nodes reach level 1, a quarter reach level 2, an eighth reach level 3, and so on. That geometric falloff is exactly what gives you O(log n) expected height — the same shape a balanced tree works hard to maintain manually.

### Step-by-Step Walkthrough

1. **Search** starts at the top-left "header" node, on the highest level.
2. Move *right* while the next value is still smaller than your target.
3. When you can't move right anymore, drop *down* one level and repeat.
4. At level 0, you either land on the target or confirm it's missing.

**Insert** does the same rightward/downward walk, but remembers the last node touched at each level (the `update` array). Then it splices the new node in at every level its coin flips earned it.

No rotations. No rebalancing. Just remember where you turned, and splice.

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
    def __init__(self, max_level=4, p=0.5):
        self.max_level = max_level
        self.p = p
        self.header = SkipListNode(None, max_level)
        self.level = 0

    def _random_level(self):
        # Flip a coin: heads keeps promoting to a higher express lane
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def insert(self, value):
        update = [self.header] * (self.max_level + 1)
        current = self.header

        # Walk down from the top lane, remembering where we last turned
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
            update[i] = current

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.header
            self.level = new_level

        new_node = SkipListNode(value, new_level)
        for i in range(new_level + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

    def search(self, target):
        current = self.header
        hops = 0

        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < target:
                current = current.forward[i]
                hops += 1

        current = current.forward[0]
        hops += 1

        if current and current.value == target:
            return True, hops
        return False, hops


if __name__ == "__main__":
    sl = SkipList()
    for v in [3, 6, 7, 9, 12, 19, 17, 26, 21, 25]:
        sl.insert(v)

    found, hops = sl.search(19)
    print(f"Found 19: {found} in {hops} hops")

    found, hops = sl.search(100)
    print(f"Found 100: {found} in {hops} hops")
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
    constructor(maxLevel = 4, p = 0.5) {
        this.maxLevel = maxLevel;
        this.p = p;
        this.header = new SkipListNode(null, maxLevel);
        this.level = 0;
    }

    // Flip a coin: heads keeps promoting to a higher express lane
    randomLevel() {
        let lvl = 0;
        while (Math.random() < this.p && lvl < this.maxLevel) lvl++;
        return lvl;
    }

    insert(value) {
        const update = new Array(this.maxLevel + 1).fill(this.header);
        let current = this.header;

        // Walk down from the top lane, remembering where we last turned
        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < value) {
                current = current.forward[i];
            }
            update[i] = current;
        }

        const newLevel = this.randomLevel();
        if (newLevel > this.level) {
            for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.header;
            this.level = newLevel;
        }

        const newNode = new SkipListNode(value, newLevel);
        for (let i = 0; i <= newLevel; i++) {
            newNode.forward[i] = update[i].forward[i];
            update[i].forward[i] = newNode;
        }
    }

    search(target) {
        let current = this.header;
        let hops = 0;

        for (let i = this.level; i >= 0; i--) {
            while (current.forward[i] && current.forward[i].value < target) {
                current = current.forward[i];
                hops++;
            }
        }

        current = current.forward[0];
        hops++;

        if (current && current.value === target) return { found: true, hops };
        return { found: false, hops };
    }
}

const sl = new SkipList();
[3, 6, 7, 9, 12, 19, 17, 26, 21, 25].forEach((v) => sl.insert(v));

let result = sl.search(19);
console.log(`Found 19: ${result.found} in ${result.hops} hops`);

result = sl.search(100);
console.log(`Found 100: ${result.found} in ${result.hops} hops`);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time (search/insert/delete)** | O(log n) expected | Each level holds roughly half the nodes of the level below, so height ≈ log₂(n) |
| **Space** | O(n) expected | Total node-level slots sum to roughly 2n across all lanes |

Worst case is technically O(n) — bad luck could give every node the same coin flip — but with a fair coin this is astronomically unlikely at scale, which is why production databases trust it.

---

## One Minute Insight

> **You don't have to enforce balance — you can bet on it.** A skip list never rotates, never rebalances, and never checks invariants. It just lets randomness do, on average, what red-black trees do by force. When the expected case is good enough and the implementation is dramatically simpler, probabilistic structures often win in the real world.

Next time you call `ZADD` in Redis, remember: under the hood, a coin is being flipped to decide how fast your data can be found.

*Run `code.py` or `code.js` to see it in action.*
