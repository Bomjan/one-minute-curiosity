/**
 * LRU (Least Recently Used) Cache — O(1) get and put.
 *
 * The trick: a hash map gives O(1) lookup but has no sense of order.
 * A doubly linked list gives O(1) reordering but no O(1) lookup.
 * Fuse them together and you get both for free.
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
        this.cache = new Map(); // key -> Node, for O(1) lookup

        // Sentinel head/tail so we never special-case an empty list.
        // head.next -> most recently used
        // tail.prev -> least recently used
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
        this._insertAtFront(node); // touching a key makes it "most recent"
        return node.value;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this._remove(this.cache.get(key));
        }

        const node = new Node(key, value);
        this.cache.set(key, node);
        this._insertAtFront(node);

        if (this.cache.size > this.capacity) {
            const lru = this.tail.prev; // least recently used sits right before tail
            this._remove(lru);
            this.cache.delete(lru.key);
        }
    }
}

const lru = new LRUCache(2);

lru.put(1, "a");
lru.put(2, "b");
console.log(lru.get(1)); // "a"  -> 1 is now most recently used

lru.put(3, "c");         // capacity full, evicts key 2 (least recently used)
console.log(lru.get(2)); // -1   -> evicted

lru.put(4, "d");         // evicts key 1
console.log(lru.get(1)); // -1   -> evicted
console.log(lru.get(3)); // "c"
console.log(lru.get(4)); // "d"

module.exports = LRUCache;
