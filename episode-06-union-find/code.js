/**
 * Disjoint Set Union (Union-Find) with path compression + union by rank.
 *
 * Answers two questions on a growing set of connections, almost in O(1):
 *   1. connected(a, b)?
 *   2. union(a, b)
 */

class DisjointSet {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i); // own island each
        this.rank = new Array(n).fill(0);                     // rough tree height
    }

    find(x) {
        // Path compression: rewire every node on the way to the root
        // straight to it, so the next lookup is instant.
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false; // already the same island

        // Union by rank: hang the shorter tree under the taller one
        // so trees stay flat instead of turning into long chains.
        if (this.rank[rootA] < this.rank[rootB]) {
            [rootA, rootB] = [rootB, rootA];
        }
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) {
            this.rank[rootA] += 1;
        }
        return true;
    }

    connected(a, b) {
        return this.find(a) === this.find(b);
    }
}

// 6 islands, no bridges yet
const islands = new DisjointSet(6);

islands.union(0, 1);
islands.union(1, 2);
islands.union(3, 4);

console.log(islands.connected(0, 2)); // true  -> bridged via 1
console.log(islands.connected(0, 3)); // false -> separate archipelagos

islands.union(2, 3);                  // build the bridge that joins them

console.log(islands.connected(0, 4)); // true  -> now one archipelago
console.log(islands.connected(0, 5)); // false -> island 5 is still alone
