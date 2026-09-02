# The Cache That Knows What to Forget

Your browser can't remember every page you've ever visited, your CPU can't cache every value it's ever touched, and your phone can't keep every app fully loaded in RAM. Something has to get evicted. The question is: which one, and how do you decide *fast*?

---

## The Problem

Design a cache with a fixed capacity `n` that supports two operations, both in **O(1)** time:

- `get(key)` → return the value if it exists, else `-1`
- `put(key, value)` → insert or update the value; if the cache is full, evict the **least recently used** item first

The catch: a plain hash map gives you O(1) lookups but has no sense of "order of use." A plain array or list can track order but costs O(n) to search or shift elements. You need both — at the same time, with no compromise.

---

## Example

```
Cache capacity = 2

put(1, "A")        → cache: {1: A}
put(2, "B")        → cache: {1: A, 2: B}
get(1)              → returns "A"   (1 is now the most recently used)
put(3, "C")         → capacity exceeded, evict 2 (least recently used)
                       cache: {1: A, 3: C}
get(2)              → returns -1   (evicted, no longer present)
```

Every access — a `get` or a `put` — refreshes an item's position at the "recently used" end. Whatever sits at the opposite end is the next one out the door.

---

## Why It Matters

The LRU cache isn't a toy interview question — it's running underneath software you use every hour:

| Domain | Real-World Use |
| :--- | :--- |
| **Operating systems** | Page replacement for virtual memory |
| **Databases** | Buffer pool eviction (MySQL InnoDB, PostgreSQL) |
| **CDNs & browsers** | Deciding which cached assets to drop first |
| **CPU architecture** | Cache line eviction policies |
| **Web backends** | In-memory caches like Redis (`maxmemory-policy allkeys-lru`) |

The deeper lesson: **when memory is finite and access patterns are unpredictable, "most recently used" is a surprisingly good proxy for "will be used again soon."**

---

## Solution

### The Key Insight: Combine a Hash Map with a Doubly Linked List

- The **hash map** gives O(1) access to any node by key.
- The **doubly linked list** keeps nodes ordered by recency — most recently used at the head, least recently used at the tail — and supports O(1) removal and insertion because each node holds direct pointers to its neighbors.

Every `get` or `put` moves the touched node to the head. When capacity overflows, the tail node — untouched the longest — gets unlinked and its key deleted from the map. No scanning, no shifting.

### Step-by-Step Walkthrough

1. **`get(key)`**: look up the node in the hash map (O(1)). If found, unlink it from its current position and re-insert it at the head. Return its value.
2. **`put(key, value)`**: if the key exists, update its value and move it to the head. If it doesn't, create a new node, insert it at the head, and add it to the map.
3. **Overflow check**: after inserting, if the cache exceeds capacity, remove the tail node and delete its key from the map.

Two sentinel nodes (a dummy head and dummy tail) remove all the `if node is null` edge cases when linking and unlinking — a small trick that keeps the code clean.

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
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> Node

        # Sentinel nodes avoid null checks at the boundaries
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_at_head(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_at_head(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._insert_at_head(node)

        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]


if __name__ == "__main__":
    lru = LRUCache(2)
    lru.put(1, "A")
    lru.put(2, "B")
    print(lru.get(1))   # "A"
    lru.put(3, "C")      # evicts key 2
    print(lru.get(2))   # -1
    print(lru.get(3))   # "C"
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

        // Sentinel nodes avoid null checks at the boundaries
        this.head = new Node();
        this.tail = new Node();
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    _remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    _insertAtHead(node) {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        const node = this.cache.get(key);
        this._remove(node);
        this._insertAtHead(node);
        return node.value;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this._remove(this.cache.get(key));
        }

        const node = new Node(key, value);
        this.cache.set(key, node);
        this._insertAtHead(node);

        if (this.cache.size > this.capacity) {
            const lru = this.tail.prev;
            this._remove(lru);
            this.cache.delete(lru.key);
        }
    }
}

const lru = new LRUCache(2);
lru.put(1, "A");
lru.put(2, "B");
console.log(lru.get(1));  // "A"
lru.put(3, "C");           // evicts key 2
console.log(lru.get(2));  // -1
console.log(lru.get(3));  // "C"
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per `get`/`put` | Hash map gives direct node access; linked list gives O(1) unlink/relink |
| **Space** | O(capacity) | One map entry and one node per cached item |

A naive array-based cache would need O(n) to find the least-recently-used item or to shift elements after eviction. Pairing a hash map with a doubly linked list eliminates both costs.

---

## One Minute Insight

> **When you need fast lookup *and* fast reordering, don't pick one data structure — combine two.** A hash map alone forgets order; a linked list alone forgets how to search. Together, each covers the other's blind spot in constant time.

This is the same trade-off every real system with finite memory has to make: you can't remember everything, so you need a cheap, local signal — "was this touched recently?" — that approximates the expensive, global answer of "will this be needed again?" It's not perfect, but it's O(1) and right often enough to run half the caching layers in production software today.

*Run `code.py` or `code.js` to see it in action.*
