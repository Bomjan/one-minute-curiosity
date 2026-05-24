# The Ring That Keeps Distributed Systems Sane

Most developers know `hash(key) % N` for distributing load across servers. It's simple — until a server dies. Then *everything* breaks.

---

## The Problem

You have `N` cache servers. You route requests using:

```
server = hash(request_key) % N
```

One server goes down. Now you have `N-1` servers. The modulo changes. Suddenly, nearly every key maps to a **different** server than before.

Your entire cache is invalidated. Every request hits the database. Cascading failure. 💥

> How do you distribute keys across servers so that when a node joins or leaves, only a minimal number of keys need to move?

---

## Example

```
Servers: ["A", "B", "C"]
Key "user:42" → Server B

Server B crashes. Servers: ["A", "C"]

With naive hashing:   "user:42" might now → Server A  (mapping changed)
With consistent hash: "user:42" → Server C  (nearest clockwise successor)

Only ~1/N of keys are remapped. Not all of them.
```

---

## Why It Matters

This is foundational to how the internet scales:

| System | Uses Consistent Hashing |
| :--- | :--- |
| **Amazon DynamoDB** | Partitioning across storage nodes |
| **Apache Cassandra** | Token ring for data distribution |
| **Redis Cluster** | Hash slots with virtual nodes |
| **Akamai CDN** | Routing requests to edge servers |
| **Memcached (libketama)** | Client-side cache sharding |

Without it, any topology change in a distributed cluster would cause a thundering herd — every client simultaneously invalidating their cache and slamming the origin.

---

## Solution

### The Insight: Put Everything on a Ring

Imagine a circular number line from `0` to `2^32 - 1`. Hash each server onto this ring. To route a key:

1. Hash the key to a point on the ring.
2. Walk **clockwise** until you hit a server.
3. That server owns the key.

```
Ring (0 ──────────────────── 2^32)

          hash("A") = 10
            ↓
  ──────── A ──────── B ──────── C ────────
                      ↑                ↑
                hash("B")=50      hash("C")=80

Key "user:42" → hash = 35 → walks clockwise → lands on B
```

When server B is removed, its keys flow to C (the next clockwise node). Only B's slice of the ring is affected — A and C keep all their existing keys.

### Virtual Nodes: Solving the Uneven Distribution Problem

With only 3 real servers, the hash ring might distribute space unevenly. One server could own 70% of the ring by chance.

**Fix:** Each physical server is represented by `V` virtual nodes on the ring. More virtual nodes = smoother distribution.

```
Instead of:   A ── B ── C

You get:      A1 ── C2 ── B1 ── A2 ── C1 ── B2 ── A3 ...
```

Each physical server handles multiple small slices. When you add a new server `D`, it absorbs small portions from *all* existing servers — perfectly balanced.

### The Algorithm

```
Setup:
  for each physical node:
    for i in 0..V:
      place hash(node + "#" + i) on the ring

Route(key):
  h = hash(key)
  find the first ring position >= h (wrap around if needed)
  return the physical node at that position
```

---

## Code

### Python

```python
import hashlib
import bisect

class ConsistentHashRing:
    def __init__(self, nodes=None, virtual_nodes=150):
        self.virtual_nodes = virtual_nodes
        self.ring = {}
        self.sorted_keys = []
        for node in (nodes or []):
            self.add_node(node)

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node):
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}#vnode{i}")
            self.ring[h] = node
            bisect.insort(self.sorted_keys, h)

    def remove_node(self, node):
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}#vnode{i}")
            del self.ring[h]
            self.sorted_keys.remove(h)

    def get_node(self, key):
        if not self.ring:
            return None
        h = self._hash(key)
        idx = bisect.bisect(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]


if __name__ == "__main__":
    ring = ConsistentHashRing(nodes=["server-A", "server-B", "server-C"])

    keys = [f"user:{i}" for i in range(9)]
    print("Before removing server-B:")
    for k in keys:
        print(f"  {k} → {ring.get_node(k)}")

    ring.remove_node("server-B")
    print("\nAfter removing server-B:")
    for k in keys:
        print(f"  {k} → {ring.get_node(k)}")
```

### JavaScript

```javascript
const crypto = require("crypto");

class ConsistentHashRing {
  constructor(nodes = [], virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    this.ring = new Map();
    this.sortedKeys = [];
    nodes.forEach(node => this.addNode(node));
  }

  _hash(key) {
    const hex = crypto.createHash("md5").update(key).digest("hex").slice(0, 8);
    return parseInt(hex, 16);
  }

  addNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = this._hash(`${node}#vnode${i}`);
      this.ring.set(h, node);
      this._sortedInsert(h);
    }
  }

  removeNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = this._hash(`${node}#vnode${i}`);
      this.ring.delete(h);
      this.sortedKeys = this.sortedKeys.filter(k => k !== h);
    }
  }

  getNode(key) {
    if (this.ring.size === 0) return null;
    const h = this._hash(key);
    const idx = this._bisect(h) % this.sortedKeys.length;
    return this.ring.get(this.sortedKeys[idx]);
  }

  _sortedInsert(val) {
    const idx = this._bisect(val);
    this.sortedKeys.splice(idx, 0, val);
  }

  _bisect(val) {
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      this.sortedKeys[mid] <= val ? (lo = mid + 1) : (hi = mid);
    }
    return lo;
  }
}

const ring = new ConsistentHashRing(["server-A", "server-B", "server-C"]);
const keys = Array.from({ length: 9 }, (_, i) => `user:${i}`);

console.log("Before removing server-B:");
keys.forEach(k => console.log(`  ${k} → ${ring.getNode(k)}`));

ring.removeNode("server-B");
console.log("\nAfter removing server-B:");
keys.forEach(k => console.log(`  ${k} → ${ring.getNode(k)}`));
```

---

## Complexity

| Dimension | Value | Notes |
| :--- | :--- | :--- |
| **Setup** | O(N × V × log(N × V)) | Inserting V virtual nodes per server into sorted list |
| **Lookup** | O(log(N × V)) | Binary search on the sorted ring |
| **Add/Remove node** | O(V × log(N × V)) | Insert/delete V virtual positions |
| **Space** | O(N × V) | V virtual nodes per physical server |

With `V=150` and `N=10` servers, that's only 1500 positions to binary-search — negligible.

---

## One Minute Insight

> **Naive `% N` hashing is a silent time bomb in distributed systems.** The moment topology changes, you're not just moving *some* keys — you're scrambling *all* of them.

Consistent hashing solves this with a single elegant insight: put servers and keys on the same abstract circle. When a server disappears, its keys flow naturally to the next neighbor. Only `1/N` of total keys move — not `N/N`.

Virtual nodes are the second stroke of genius: they transform a potentially lopsided circle into a uniformly distributed one, and they make it trivially easy to give beefier servers a larger slice of the ring by simply assigning them more virtual nodes.

*Run `code.py` or `code.js` to see how routing changes when a node goes down — and notice how few keys actually move.*
