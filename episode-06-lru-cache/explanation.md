# The Cache That Forgets on Purpose

Every cache eventually runs out of room. The question is never *if* you evict something — it's *what* you evict, and whether you can decide fast enough to still call it a cache.

---

## The Problem

Design a cache with a fixed capacity `C`. It needs two operations, both in **O(1)** time:

- `get(key)` → return the value, or `-1` if it doesn't exist
- `put(key, value)` → insert or update a value; if the cache is full, evict the **Least Recently Used (LRU)** item first

**The catch:** "recently used" changes on every single `get`, not just on `put`. A plain hash map gives you O(1) lookups but has no memory of *order*. An array or linked list gives you order but not O(1) lookups. You need both — at the same time, on every access.

---

## Example

```
LRUCache cache(2)          # capacity = 2

cache.put(1, "A")          # cache: {1=A}
cache.put(2, "B")          # cache: {1=A, 2=B}
cache.get(1)                # returns "A", 1 is now most recent
cache.put(3, "C")          # evicts 2 (least recently used) → {1=A, 3=C}
cache.get(2)                # returns -1 (evicted)
cache.put(4, "D")          # evicts 1 → {3=C, 4=D}
cache.get(1)                # returns -1
cache.get(3)                # returns "C"
```

---

## Why It Matters

LRU eviction is one of the most-deployed algorithms on the internet, even if you've never called it by name:

| Domain | Example |
| :--- | :--- |
| **Operating systems** | Page replacement when physical memory is full |
| **Databases** | Buffer pool eviction (MySQL InnoDB, Postgres) |
| **CDNs & web caches** | Deciding which cached responses to drop |
| **CPU hardware** | Cache line replacement in L1/L2/L3 caches |
| **Browsers** | Tab discarding and image cache limits |

Almost every real cache is a variation on this exact data structure. Get it right once, and you understand a slice of nearly every system you'll ever work on.

---

## Solution

### The Insight: Combine a Hash Map with a Doubly Linked List

Neither structure alone is enough, but together they cover each other's weakness:

- **Hash map** `key → node`: O(1) lookup for any key.
- **Doubly linked list**: keeps nodes ordered by recency. The **head** is most-recently-used, the **tail** is least-recently-used.

Because it's a *doubly* linked list, any node can be unlinked and re-inserted at the head in O(1) — no scanning required, since the hash map hands you the node directly.

### The Two Operations

**`get(key)`**
1. Look up the node in the hash map — O(1).
2. If found, unlink it from its current position and move it to the head (it's now the most recent).
3. Return its value.

**`put(key, value)`**
1. If the key exists, update its value and move its node to the head.
2. If it doesn't, create a new node, insert it at the head, and add it to the map.
3. If capacity is now exceeded, remove the node at the **tail** (least recently used) and delete it from the map too.

Every step touches a fixed number of pointers — no loops, no shifting, no scanning. That's what makes it O(1).

---

## Code

### Python

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        # Dummy head/tail sentinels remove all the edge-case checks.
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

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._insert_at_head(node)
        return node.value

    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])

        node = Node(key, value)
        self.map[key] = node
        self._insert_at_head(node)

        if len(self.map) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]


if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, "A")
    cache.put(2, "B")
    print(cache.get(1))     # A
    cache.put(3, "C")       # evicts 2
    print(cache.get(2))     # -1
    cache.put(4, "D")       # evicts 1
    print(cache.get(1))     # -1
    print(cache.get(3))     # C
    print(cache.get(4))     # D
```

### JavaScript

```javascript
// A native Map remembers insertion order and lets us re-insert a key
// at the "most recent" end in O(1) — no manual linked list required.
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
    }

    get(key) {
        if (!this.map.has(key)) return -1;

        const value = this.map.get(key);
        this.map.delete(key);
        this.map.set(key, value); // re-insert → now most recently used
        return value;
    }

    put(key, value) {
        if (this.map.has(key)) {
            this.map.delete(key);
        } else if (this.map.size >= this.capacity) {
            const lruKey = this.map.keys().next().value; // first = least recent
            this.map.delete(lruKey);
        }
        this.map.set(key, value);
    }
}

const cache = new LRUCache(2);
cache.put(1, "A");
cache.put(2, "B");
console.log(cache.get(1));  // A
cache.put(3, "C");          // evicts 2
console.log(cache.get(2));  // -1
cache.put(4, "D");          // evicts 1
console.log(cache.get(1));  // -1
console.log(cache.get(3));  // C
console.log(cache.get(4));  // D
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(1) per `get` and `put` — fixed number of pointer/map operations |
| **Space** | O(C) — one map entry and one node per cached item, up to capacity `C` |

A naive "scan for the oldest item" approach costs O(n) per eviction. The hash map + linked list combo makes eviction as cheap as insertion.

---

## One Minute Insight

> **A single data structure is a single trade-off.** Hash maps trade order for speed; linked lists trade speed for order. The moment a problem needs both, stop looking for the "right" structure and start combining two "wrong" ones — the seams between them are usually where the O(1) solution hides.

*Run `code.py` or `code.js` to see it in action.*
