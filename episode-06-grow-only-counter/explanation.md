# The Like Button That Never Needs the Internet

Three servers on three continents each let people "like" a post while completely cut off from each other. No coordination, no locks, no central database. When the network comes back, they all need to agree on the *same* total — instantly, with zero conflicts. Here's the trick that makes it possible.

---

## The Problem

Imagine a distributed "like" counter for a viral post, replicated across servers in the US, EU, and Asia. Each server accepts likes independently — sometimes offline for hours.

Naive fix: each server keeps a number and you sum them when they sync. Sounds fine, until:

- A sync message gets **duplicated** by a flaky network → you double-count.
- Two servers sync with each other **twice**, in different orders → totals diverge depending on order.

You need a counter where **merging never breaks correctness**, no matter how many times, in what order, or how duplicated the merges are.

---

## Example

```
Server US: 5 likes happened locally
Server EU: 3 likes happened locally
Server ASIA: 7 likes happened locally

Naive merge (sum totals, sync twice by accident):
  5 + 3 + 7 = 15        ✅ first sync
  15 + 3 + 7 = 25       ❌ EU and ASIA re-sent, now wrong

Correct answer should always be: 15
```

The counter needs to know it already *saw* those 3 and 7 — not just add them again.

---

## Why It Matters

This exact pattern — replicas updating independently, then merging safely — powers:

| Domain | Real-World Use |
| :--- | :--- |
| **Collaborative editing** | Figma, Google Docs, Notion merging offline edits from multiple users |
| **Distributed databases** | Redis CRDTs, Riak, Cassandra counters that stay correct across data centers |
| **Mobile apps** | Syncing local changes made while offline, without a central "source of truth" |
| **Distributed systems** | Any system that favors availability over strict coordination (AP over CP in CAP theorem) |

The underlying idea is called a **CRDT** — Conflict-free Replicated Data Type. It's the reason apps can be offline-first *and* eventually consistent, without a referee deciding who "wins."

---

## Solution

### The Key Insight: Never Merge by Summing. Merge by Taking the Max.

Instead of one number per server, keep a **vector** — one slot per replica, where a replica only ever writes to *its own* slot.

```
US    = { us: 5, eu: 0, asia: 0 }
EU    = { us: 0, eu: 3, asia: 0 }
ASIA  = { us: 0, eu: 0, asia: 7 }
```

To merge two vectors, take the **element-wise maximum**, not the sum:

```
merge(US, EU) = { us: max(5,0), eu: max(0,3), asia: max(0,0) }
              = { us: 5, eu: 3, asia: 0 }
```

Total likes = sum of the merged vector's slots.

### Why `max` Instead of `+`

`max` has three properties `+` doesn't, when applied to *already-seen* data:

- **Idempotent**: merging the same vector twice changes nothing (`max(5,5) = 5`). Duplicated sync messages become harmless.
- **Commutative**: merge order doesn't matter (`max(a,b) = max(b,a)`). Network order becomes irrelevant.
- **Associative**: merging in batches gives the same result as merging one at a time.

These three properties together are exactly what's needed for **eventual consistency** — every replica converges to the same value no matter how messages are delayed, dropped, reordered, or duplicated.

### Step-by-Step Walkthrough

```
1. Each server increments only its own slot when a local like happens.
2. Servers gossip their vectors to each other whenever they can.
3. On receiving a vector, merge it in with element-wise max.
4. To read the total, just sum all slots.
5. Re-merging the same or older vector? No-op — max already saw it.
```

No locks. No leader election. No "last write wins" coin flip. Just a merge function that mathematically can't produce a wrong answer.

---

## Code

### Python

```python
class GCounter:
    """A grow-only distributed counter (CRDT)."""

    def __init__(self, node_id, all_nodes):
        self.node_id = node_id
        self.counts = {node: 0 for node in all_nodes}

    def increment(self, amount=1):
        # A replica only ever writes to its own slot.
        self.counts[self.node_id] += amount

    def merge(self, other_counts):
        # Element-wise max: idempotent, commutative, associative.
        for node, value in other_counts.items():
            self.counts[node] = max(self.counts[node], value)

    def value(self):
        return sum(self.counts.values())


if __name__ == "__main__":
    us = GCounter("us", ["us", "eu", "asia"])
    eu = GCounter("eu", ["us", "eu", "asia"])
    asia = GCounter("asia", ["us", "eu", "asia"])

    for _ in range(5):
        us.increment()
    for _ in range(3):
        eu.increment()
    for _ in range(7):
        asia.increment()

    # Gossip, in any order, even with duplicates.
    us.merge(eu.counts)
    us.merge(asia.counts)
    us.merge(eu.counts)   # duplicate sync — still safe

    print(us.value())  # 15, always
```

### JavaScript

```javascript
class GCounter {
    constructor(nodeId, allNodes) {
        this.nodeId = nodeId;
        this.counts = Object.fromEntries(allNodes.map(n => [n, 0]));
    }

    increment(amount = 1) {
        this.counts[this.nodeId] += amount;
    }

    merge(otherCounts) {
        for (const [node, value] of Object.entries(otherCounts)) {
            this.counts[node] = Math.max(this.counts[node], value);
        }
    }

    value() {
        return Object.values(this.counts).reduce((a, b) => a + b, 0);
    }
}

const us = new GCounter("us", ["us", "eu", "asia"]);
const eu = new GCounter("eu", ["us", "eu", "asia"]);
const asia = new GCounter("asia", ["us", "eu", "asia"]);

for (let i = 0; i < 5; i++) us.increment();
for (let i = 0; i < 3; i++) eu.increment();
for (let i = 0; i < 7; i++) asia.increment();

us.merge(eu.counts);
us.merge(asia.counts);
us.merge(eu.counts);   // duplicate sync — still safe

console.log(us.value());  // 15, always
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) per merge/read | n = number of replicas; one pass over the vector |
| **Space** | O(n) | One integer slot per replica, regardless of how many increments happened |

Compare that to naively logging every single increment for replay — this collapses an unbounded event history into a fixed-size vector that merges in constant work per replica.

---

## One Minute Insight

> **Don't design a system to resolve conflicts. Design the data type so conflicts are mathematically impossible.**

A CRDT doesn't pick a winner when two updates collide — it defines the merge so that *any* order, *any* duplication, *any* delay still lands on the same answer. That's the difference between building a referee and building a rulebook nobody can break.

*Run `code.py` or `code.js` to see it in action.*
