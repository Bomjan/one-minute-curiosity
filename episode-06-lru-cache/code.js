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
cache.put(3, "C");          // evicts 2 (least recently used)
console.log(cache.get(2));  // -1
cache.put(4, "D");          // evicts 1
console.log(cache.get(1));  // -1
console.log(cache.get(3));  // C
console.log(cache.get(4));  // D
