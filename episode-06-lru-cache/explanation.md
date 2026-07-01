# The Cache That Forgets on Purpose

Your desk only fits so many sticky notes. When a new one arrives and there's no room, you don't throw away a random note — you throw away the one you haven't touched in the longest time. That's the entire idea behind one of the most-implemented data structures in software engineering.

---

## The Problem

Design a cache with a fixed `capacity` that supports two operations, both in **O(1)** time:

- `get(key)` — return the value if `key` exists, else `-1`. Accessing a key makes it "recently used."
- `put(key, value)` — insert or update a key. If the cache is full, evict the **least recently used** entry first.

A plain hash map gives you O(1) lookup but has no idea what "recently used" means. A plain array or linked list can track order but not O(1) lookup. You need both — at the same time.

---

## Example

```
LRUCache cache(2)          // capacity = 2

cache.put(1, "a")          // cache: {1=a}
cache.put(2, "b")          // cache: {1=a, 2=b}
cache.get(1)                // returns "a", 1 becomes most recently used
cache.put(3, "c")          // capacity full → evicts 2 (least recently used)
cache.get(2)                // returns -1 (evicted)
cache.put(4, "d")          // evicts 1
cache.get(1)                // returns -1 (evicted)
cache.get(3)                // returns "c"
cache.get(4)                // returns "d"
```

---

## Why It Matters

LRU eviction is quietly running underneath most of the systems you use every day:

| Domain | Real-World Analogy |
| :--- | :--- |
| **Operating systems** | Page replacement — which memory page gets swapped out when RAM is full |
| **Databases** | Buffer pool eviction (MySQL's InnoDB, PostgreSQL) — which disk page stays cached in memory |
| **CPUs** | Cache line eviction in L1/L2/L3 caches |
| **Web/CDNs** | Which assets stay warm at the edge vs. get evicted back to origin |
| **Browsers** | `Cache-Control` and in-memory resource caches |

The deeper lesson: **when one data structure can't give you everything you need, combine two that complement each other's weaknesses.**

---

## Solution

### The Key Insight: Fuse a Hash Map with a Doubly Linked List

- **Hash map** (`key -> node`): O(1) lookup to find any entry instantly.
- **Doubly linked list**: keeps entries ordered by recency. The front is "most recently used," the back is "least recently used." Moving a node to the front, or removing it from anywhere, is O(1) — because with a doubly linked list you never need to *search* for a neighbor, you already hold a pointer to it.

Every `get` or `put` on an existing key does the same two-step dance: **unlink the node from wherever it sits, then reinsert it at the front.** Both steps are O(1) because the hash map hands you the node directly — no scanning required.

When the cache overflows, the least recently used node is always sitting right at the tail, ready to be evicted in O(1).

### Step-by-Step Walkthrough

```
capacity = 2

put(1, "a")   list: [1]
put(2, "b")   list: [2, 1]         <- most recent first
get(1)        list: [1, 2]         <- 1 moved to front
put(3, "c")   over capacity! evict tail (2)
              list: [3, 1]
get(2)        -> -1 (gone)
```

Sentinel `head` and `tail` nodes remove the need to special-case an empty list or single-node list — every insert/remove touches real neighbors on both sides.

---

## Code

### Python

```python
class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}  # key -> Node

        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_at_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_at_front(node)
        return node.value

    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._insert_at_front(node)

        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]


lru = LRUCache(2)
lru.put(1, "a")
lru.put(2, "b")
print(lru.get(1))   # "a"
lru.put(3, "c")      # evicts 2
print(lru.get(2))   # -1
```

### JavaScript

```javascript
class Node {
    constructor(key = 0, value = 0) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map(); // key -> Node

        this.head = new Node();
        this.tail = new Node();
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    _remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    _insertAtFront(node) {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        const node = this.cache.get(key);
        this._remove(node);
        this._insertAtFront(node);
        return node.value;
    }

    put(key, value) {
        if (this.cache.has(key)) this._remove(this.cache.get(key));

        const node = new Node(key, value);
        this.cache.set(key, node);
        this._insertAtFront(node);

        if (this.cache.size > this.capacity) {
            const lru = this.tail.prev;
            this._remove(lru);
            this.cache.delete(lru.key);
        }
    }
}

const lru = new LRUCache(2);
lru.put(1, "a");
lru.put(2, "b");
console.log(lru.get(1)); // "a"
lru.put(3, "c");          // evicts 2
console.log(lru.get(2)); // -1
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `get`/`put` | Hash map gives instant node access; doubly linked list gives instant reordering/removal |
| **Space** | O(capacity) | One hash map entry and one list node per cached key |

A naive array-based cache would need O(n) to find the least-recently-used entry, or O(n) to shift elements when reordering. Fusing a hash map with a doubly linked list eliminates both costs.

---

## One Minute Insight

> **No single data structure is ever "the answer" — combining two that cover each other's blind spots usually is.** A hash map is blind to order. A linked list is blind to lookup. Together, they're blind to nothing.

This is the same instinct behind graph adjacency lists paired with visited sets, or B-trees pairing sorted order with fast search. When you're stuck optimizing one operation without breaking another, ask: *what second structure would erase this constraint entirely?*

*Run `code.py` or `code.js` to see it in action.*
