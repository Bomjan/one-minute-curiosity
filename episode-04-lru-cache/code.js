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
