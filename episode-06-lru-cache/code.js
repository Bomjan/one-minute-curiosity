/**
 * LRU (Least Recently Used) Cache — O(1) get and put.
 *
 * Combines a hash map (for O(1) lookup) with a doubly linked list
 * (for O(1) reordering) so the cache always knows, in constant time,
 * which item was touched least recently.
 */

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
lru.put(3, "C");           // evicts key 2 (least recently used)
console.log(lru.get(2));  // -1
console.log(lru.get(3));  // "C"
