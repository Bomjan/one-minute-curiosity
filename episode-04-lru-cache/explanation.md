# The O(1) Memory Bouncer: Building an LRU Cache

Your server has limited memory. You need to cache frequently used data — but when you're full, which item do you throw out? The answer: the one nobody's touched in the longest time. That's the **Least Recently Used (LRU)** eviction policy, and it's everywhere: OS kernels, Redis, browsers, CDNs.

The catch? You need to do it in **O(1)** time. Every get. Every put. No scanning.

---

## The Problem

Design a cache that:
- Holds at most `capacity` items
- Returns any cached value in **O(1)**
- On `put`, if at capacity, **evicts the least recently used** item — in **O(1)**
- Any `get` or `put` marks that item as **most recently used**

---

## Example

```
Cache capacity: 3

put(1, "a") → Cache: {1:"a"}
put(2, "b") → Cache: {1:"a", 2:"b"}
put(3, "c") → Cache: {1:"a", 2:"b", 3:"c"}

get(1)      → "a"   | 1 is now most recent
                    | Cache order (LRU → MRU): 2, 3, 1

put(4, "d") → full! evict 2 (least recent)
                    | Cache: {3:"c", 1:"a", 4:"d"}

get(2)      → -1    | 2 was evicted
```

---

## Why It Matters

LRU is the eviction algorithm behind:

| System | Where LRU lives |
| :--- | :--- |
| **Linux kernel** | Page frame reclamation (swap decisions) |
| **CPU L1/L2 cache** | Cache line eviction policy |
| **Redis** | `maxmemory-policy allkeys-lru` |
| **Browser engines** | Suspending background tabs |
| **CDN edge nodes** | Object eviction under memory pressure |

A naïve implementation using a list scans O(n) on every access. The real version does O(1) — and the insight is combining two data structures that each solve one half of the problem.

---

## Solution

### The Insight: Two Structures, One Goal

Neither data structure alone is enough:

- **HashMap** → O(1) lookup by key, but no concept of "order" or "recency"
- **Linked List** → O(1) insert/delete anywhere, but O(n) to find an element

Together:
- HashMap maps each key to its **node in the linked list**
- Doubly linked list tracks **usage order** (head = MRU, tail = LRU)

Every access moves the node to the front. Eviction removes the tail. The HashMap always points to the node directly — no searching.

### The Trick: Sentinel Nodes

Use dummy `head` and `tail` nodes. This eliminates edge-case checks for empty lists or single-element caches. Real nodes live between them.

```
head ↔ [most recent] ↔ ... ↔ [least recent] ↔ tail
```

### Walkthrough

```
Capacity = 2

put(1, "one"):
  head ↔ [1:"one"] ↔ tail
  map = {1: node1}

put(2, "two"):
  head ↔ [2:"two"] ↔ [1:"one"] ↔ tail
  map = {1: node1, 2: node2}

get(1):           ← move node1 to front
  head ↔ [1:"one"] ↔ [2:"two"] ↔ tail

put(3, "three"):  ← full! evict tail.prev = node2 (key=2)
  remove node2, delete map[2]
  insert node3 at front
  head ↔ [3:"three"] ↔ [1:"one"] ↔ tail
  map = {1: node1, 3: node3}

get(2) → -1       ← evicted
```

---

## Code

### Python

```python
class Node:
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}
        self.head, self.tail = Node(), Node()  # sentinels
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._insert_front(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._insert_front(node)
        if len(self.map) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]


if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, "one")
    cache.put(2, "two")
    print(cache.get(1))     # "one"  — 1 is now MRU
    cache.put(3, "three")   # evicts 2
    print(cache.get(2))     # -1     — evicted
    print(cache.get(3))     # "three"
    print(cache.get(1))     # "one"
```

### JavaScript

```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        // JS Map preserves insertion order — acts as our ordered structure
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        const value = this.cache.get(key);
        // Re-insert to mark as most recently used
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, value);
        if (this.cache.size > this.capacity) {
            // First key in Map = least recently used
            this.cache.delete(this.cache.keys().next().value);
        }
    }
}

const cache = new LRUCache(2);
cache.put(1, "one");
cache.put(2, "two");
console.log(cache.get(1));    // "one"
cache.put(3, "three");        // evicts 2
console.log(cache.get(2));    // -1
console.log(cache.get(3));    // "three"
console.log(cache.get(1));    // "one"
```

> **Note on the JS version:** JavaScript's `Map` preserves insertion order and O(1) get/set/delete — which makes it a built-in ordered hash map. The Python equivalent is `collections.OrderedDict`. Both let you implement LRU without manually managing a linked list.

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(1) for both `get` and `put` |
| **Space** | O(capacity) — the cache never grows beyond its limit |

A brute-force approach (linear scan for the LRU item) would cost O(n) per operation. The HashMap + DLL combination eliminates the scan entirely.

---

## One Minute Insight

> **Two weak structures can form one strong one.** A HashMap is fast but orderless. A doubly linked list is ordered but slow to search. Combined, they create a data structure with O(1) lookup *and* O(1) ordered access — something neither achieves alone.

This is a pattern, not a trick: when a single structure can't meet all your constraints, look for two complementary ones. The LRU cache is just the most famous example of this idea, powering billions of cache hits every second across Linux, Redis, and your browser — right now.

*Run `code.py` or `code.js` to see it in action.*
