# Time Without a Clock

Two servers on opposite sides of the planet each accept a write to the same record, half a second apart by their own wall clocks. Whose write happened "first"? Trick question — in a distributed system, wall clocks lie, drift, and can't be trusted to agree. So how does a database like DynamoDB or Riak figure out what really happened before what?

---

## The Problem

You have `n` independent nodes in a distributed system. Each node processes local events and occasionally sends messages to other nodes. There is **no shared clock** — NTP sync drifts, network latency is unpredictable, and physical timestamps can even go backward.

Given two events, you need to answer one question without ever trusting a timestamp:

**Did event A cause event B, did B cause A, or did they happen independently (concurrently), with neither aware of the other?**

This isn't academic — it's exactly the question a database must answer when two clients edit the same key at "the same time." Get it wrong, and you silently drop someone's write.

---

## Example

```
Node A: writes value X          → A's clock: {A:1, B:0, C:0}
Node A: sends message to Node B

Node B: receives A's message,
        merges clocks, then writes Y   → B's clock: {A:1, B:1, C:0}

Node C: independently writes Z  → C's clock: {A:0, B:0, C:1}
```

Compare `B: {A:1, B:1, C:0}` vs `C: {A:0, B:0, C:1}`:
- B's write knows about A's write (causally *after* it).
- C's write knows about neither — it happened **concurrently** with both.

No wall clock was ever consulted. The vectors alone prove the causal story.

---

## Why It Matters

| Domain | Real-World Use |
| :--- | :--- |
| **Distributed databases** | DynamoDB and Riak use vector clocks to detect conflicting writes and offer both versions back to the client instead of silently overwriting |
| **Version control** | Git's commit DAG encodes the same "happened-before" partial order — a merge is just resolving concurrent branches |
| **Collaborative editing** | CRDTs (Google Docs-style offline editing) rely on causal ordering to merge concurrent edits deterministically |
| **Distributed tracing** | Debugging "which service call triggered which" across microservices without synchronized clocks |
| **Cache invalidation** | Knowing whether a cached write is stale relative to the source of truth, even across regions |

The deeper lesson: **causality is a partial order, not a timeline.** Some events are provably ordered; others simply can't be compared, and pretending otherwise is where bugs live.

---

## Solution

### The Key Insight: Track "What I've Seen," Not "What Time It Is"

Each node keeps a vector of counters — one slot per node in the system. The rules are simple:

1. **Local event** → increment your own slot.
2. **Send a message** → attach your current vector.
3. **Receive a message** → take the element-wise **max** of your vector and the sender's, then increment your own slot.

To compare two vectors `A` and `B`:
- If every slot of `A` is `≤` the matching slot of `B` → `A` happened **before** `B`.
- If every slot of `B` is `≤` the matching slot of `A` → `B` happened **before** `A`.
- If neither holds → they're **concurrent**. Nobody caused the other.

### Step-by-Step Walkthrough

```
Nodes: A, B, C — start at {A:0, B:0, C:0} each

1. A ticks locally           → A = {A:1, B:0, C:0}
2. A sends its vector to B
3. B merges (max) then ticks → B = {A:1, B:1, C:0}
4. C ticks locally, unaware  → C = {A:0, B:0, C:1}

Compare B vs C:
  B ≤ C?  1≤0? No  → false
  C ≤ B?  1≤0 (C's slot vs B's slot)? No → false
  → CONCURRENT: B and C never learned about each other.
```

Every increment and every merge is a constant amount of work — the vector just grows one slot per known node.

---

## Code

### Python

```python
class VectorClock:
    def __init__(self, node_id, nodes):
        self.node_id = node_id
        self.clock = {n: 0 for n in nodes}

    def tick(self):
        """Local event: bump this node's own counter."""
        self.clock[self.node_id] += 1
        return dict(self.clock)

    def merge(self, other_clock):
        """Receive a message: absorb the max of every slot, then tick."""
        for node, count in other_clock.items():
            self.clock[node] = max(self.clock.get(node, 0), count)
        return self.tick()

    @staticmethod
    def compare(a, b):
        """Return 'before', 'after', 'concurrent', or 'equal'."""
        keys = set(a) | set(b)
        a_le_b = all(a.get(k, 0) <= b.get(k, 0) for k in keys)
        b_le_a = all(b.get(k, 0) <= a.get(k, 0) for k in keys)
        if a_le_b and b_le_a:
            return "equal"
        if a_le_b:
            return "before"
        if b_le_a:
            return "after"
        return "concurrent"


if __name__ == "__main__":
    nodes = ["A", "B", "C"]
    a, b, c = (VectorClock(n, nodes) for n in nodes)

    a_snapshot = a.tick()            # A writes locally
    b_snapshot = b.merge(a_snapshot)  # B receives A's message, then writes
    c_snapshot = c.tick()             # C writes independently

    print("A:", a_snapshot)
    print("B:", b_snapshot)
    print("C:", c_snapshot)

    print("A vs B:", VectorClock.compare(a_snapshot, b_snapshot))  # before
    print("B vs C:", VectorClock.compare(b_snapshot, c_snapshot))  # concurrent
```

### JavaScript

```javascript
class VectorClock {
    constructor(nodeId, nodes) {
        this.nodeId = nodeId;
        this.clock = Object.fromEntries(nodes.map((n) => [n, 0]));
    }

    tick() {
        // Local event: bump this node's own counter.
        this.clock[this.nodeId] += 1;
        return { ...this.clock };
    }

    merge(otherClock) {
        // Receive a message: absorb the max of every slot, then tick.
        for (const [node, count] of Object.entries(otherClock)) {
            this.clock[node] = Math.max(this.clock[node] ?? 0, count);
        }
        return this.tick();
    }

    static compare(a, b) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        let aLeB = true;
        let bLeA = true;
        for (const k of keys) {
            const av = a[k] ?? 0;
            const bv = b[k] ?? 0;
            if (av > bv) aLeB = false;
            if (bv > av) bLeA = false;
        }
        if (aLeB && bLeA) return "equal";
        if (aLeB) return "before";
        if (bLeA) return "after";
        return "concurrent";
    }
}

const nodes = ["A", "B", "C"];
const [a, b, c] = nodes.map((n) => new VectorClock(n, nodes));

const aSnapshot = a.tick();            // A writes locally
const bSnapshot = b.merge(aSnapshot);   // B receives A's message, then writes
const cSnapshot = c.tick();             // C writes independently

console.log("A:", aSnapshot);
console.log("B:", bSnapshot);
console.log("C:", cSnapshot);

console.log("A vs B:", VectorClock.compare(aSnapshot, bSnapshot)); // before
console.log("B vs C:", VectorClock.compare(bSnapshot, cSnapshot)); // concurrent
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) per tick/merge/compare | n = number of nodes; every operation touches at most one slot per node |
| **Space** | O(n) per clock | Each node stores one counter per known node in the system |

The tradeoff is real: vector clocks scale with the number of nodes, which is why production systems (Riak, Voldemort) prune or cap them — but for a bounded cluster, O(n) is cheap for a guarantee this strong.

---

## One Minute Insight

> **You don't need a clock to know what happened first — you need a record of what each party has already seen.** Causality is provable from information flow alone; wall-clock time is just a convenient (and unreliable) proxy for it.

The moment two nodes act without hearing from each other, "concurrent" isn't a bug to fix — it's the honest answer. Systems that force a false ordering onto concurrent events are the ones that quietly lose data. Vector clocks make "I don't know which came first" a first-class, queryable result instead of a hidden assumption.

*Run `code.py` or `code.js` to see it in action.*
