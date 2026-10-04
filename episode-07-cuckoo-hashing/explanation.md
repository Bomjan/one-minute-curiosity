# Cuckoo Hashing: The Hash Table That Evicts Its Neighbours

What if a hash table could promise **at most two memory probes per lookup, ever**, by borrowing the nastiest habit of the cuckoo bird?

---

## The Problem

Regular hash tables resolve collisions by chaining or probing, so a lookup can wander through a long chain on a bad day. That's fine for a blog, but not for a network router or a packet filter that must answer in a fixed number of steps.

Cuckoo hashing makes a strict rule: every key has exactly **two possible homes**, one per hash function (`h1` and `h2`). A lookup checks both and stops.

Inserting is where the fun is. If both homes are taken, the newcomer **kicks out** a resident, like a cuckoo chick shoving eggs out of the nest. The evicted key then moves to *its* other home, possibly kicking out someone else, and so on.

---

## Example

```
Table 1: [ _ , _ , _ ]    Table 2: [ _ , _ , _ ]

put("A") -> h1(A)=0          T1: [A, _, _]
put("B") -> h1(B)=0, taken!  B takes T1[0], A is evicted
                             A moves to h2(A)=2:  T2: [_, _, A]
get("A") -> check T1[h1], then T2[h2] -> found in 2 probes
get("Z") -> both slots checked, neither matches -> missing, 2 probes
```

---

## Why It Matters

| Domain | Where it shows up |
| :--- | :--- |
| **Networking** | Hardware switches and routers use cuckoo tables for deterministic-latency lookups |
| **Systems** | MemC3 and similar in-memory caches use cuckoo variants for dense, fast storage |
| **Filters** | Cuckoo *filters* replace Bloom filters when you need deletion |
| **Security** | Predictable worst-case time resists algorithmic-complexity attacks |

---

## Solution

### The Key Insight: Two Choices Are Enough

A lookup only ever touches two slots, so reads are worst-case O(1), not average-case. All the uncertainty is pushed into inserts.

### Step-by-Step Walkthrough

1. **Lookup:** check `T1[h1(key)]`, then `T2[h2(key)]`. Done.
2. **Insert:** if the key exists, update it. Otherwise place it in `T1[h1(key)]`.
3. **Kick:** if that slot was occupied, the old resident is now homeless. Send it to *its other table*. Repeat.
4. **Cycle guard:** if the chain of evictions goes on too long (say 32 kicks), the keys are probably looping. Double the tables, pick fresh slots by rehashing everything, and place the homeless key.

Think of musical chairs where each person has exactly two acceptable chairs. Usually someone finds a spot after a few shoves. Occasionally the shoving loops forever, so you add more chairs.

---

## Code

### Python

```python
class CuckooHashTable:
    """Hash table with worst-case O(1) lookups: every key lives in one of two slots."""

    def __init__(self, capacity=8, max_kicks=32):
        self.capacity = capacity
        self.max_kicks = max_kicks
        self.tables = [[None] * capacity, [None] * capacity]
        self.size = 0

    def _slot(self, which, key):
        # Two different hash functions: salt the built-in hash with the table number
        return hash((which, key)) % self.capacity

    def get(self, key, default=None):
        # At most two probes, no matter how full the table is
        for which in (0, 1):
            entry = self.tables[which][self._slot(which, key)]
            if entry is not None and entry[0] == key:
                return entry[1]
        return default

    def put(self, key, value):
        for which in (0, 1):  # update in place if the key already exists
            slot = self._slot(which, key)
            entry = self.tables[which][slot]
            if entry is not None and entry[0] == key:
                self.tables[which][slot] = (key, value)
                return

        entry, which = (key, value), 0
        for _ in range(self.max_kicks):
            slot = self._slot(which, entry[0])
            # Take the nest; the evicted entry must go to its *other* table
            entry, self.tables[which][slot] = self.tables[which][slot], entry
            if entry is None:
                self.size += 1
                return
            which = 1 - which

        # Probably a cycle: grow, rehash, and place the homeless entry
        self._rehash()
        self.put(*entry)

    def _rehash(self):
        old = [e for t in self.tables for e in t if e is not None]
        self.capacity *= 2
        self.tables = [[None] * self.capacity, [None] * self.capacity]
        self.size = 0
        for k, v in old:
            self.put(k, v)


if __name__ == "__main__":
    t = CuckooHashTable()
    for i in range(100):
        t.put(f"user{i}", i)
    print(t.get("user42"))   # 42
    print(t.get("nobody"))   # None
    print(t.size)            # 100
```

### JavaScript

```javascript
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
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Lookup** | O(1) worst case | Exactly two probes |
| **Insert** | O(1) amortized, expected | Eviction chains are short with low load; rare rehashes are spread out |
| **Space** | O(n) | Two arrays; keep load factor under ~50% for plain two-table cuckoo |

---

## One Minute Insight

> **Trade a hard insert for a guaranteed read.** Cuckoo hashing moves all the unpredictability into writes, so reads become boringly constant. When your system lives or dies on worst-case latency, that's the right trade.

*Run `code.py` or `code.js` to see it in action.*
