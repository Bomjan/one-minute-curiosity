class CuckooHashTable {
    constructor(capacity = 8, maxKicks = 32) {
        this.capacity = capacity;
        this.maxKicks = maxKicks;
        this.tables = [new Array(capacity).fill(null), new Array(capacity).fill(null)];
        this.size = 0;
    }

    // Two independent hash functions: FNV-1a with a different seed per table
    slot(which, key) {
        let h = which === 0 ? 2166136261 : 84696351;
        for (const ch of String(key)) {
            h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
        }
        return h % this.capacity;
    }

    get(key) {
        // At most two probes, no matter how full the table is
        for (const which of [0, 1]) {
            const entry = this.tables[which][this.slot(which, key)];
            if (entry && entry[0] === key) return entry[1];
        }
        return undefined;
    }

    put(key, value) {
        for (const which of [0, 1]) {
            const slot = this.slot(which, key);
            const entry = this.tables[which][slot];
            if (entry && entry[0] === key) {
                this.tables[which][slot] = [key, value];
                return;
            }
        }

        let entry = [key, value];
        let which = 0;
        for (let i = 0; i < this.maxKicks; i++) {
            const slot = this.slot(which, entry[0]);
            // Take the nest; the evicted entry must go to its other table
            [entry, this.tables[which][slot]] = [this.tables[which][slot], entry];
            if (entry === null) {
                this.size++;
                return;
            }
            which = 1 - which;
        }

        // Probably a cycle: grow, rehash, and place the homeless entry
        this.rehash();
        this.put(...entry);
    }

    rehash() {
        const old = this.tables.flat().filter(Boolean);
        this.capacity *= 2;
        this.tables = [new Array(this.capacity).fill(null), new Array(this.capacity).fill(null)];
        this.size = 0;
        for (const [k, v] of old) this.put(k, v);
    }
}

const t = new CuckooHashTable();
for (let i = 0; i < 100; i++) t.put(`user${i}`, i);
console.log(t.get("user42"));  // 42
console.log(t.get("nobody"));  // undefined
console.log(t.size);           // 100
