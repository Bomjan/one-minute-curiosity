class UnionFind {
    // Tracks connected groups and answers "are these connected?" in ~O(1).
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i); // everyone leads themselves
        this.rank = new Array(n).fill(0); // rough "tree height" for smart merging
    }

    find(x) {
        // Path compression: point straight at the root while we're here,
        // so the next lookup for x (and everyone we pass) is instant.
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false; // already in the same group

        // Union by rank: hang the shorter tree under the taller one
        // so trees stay shallow instead of turning into a long chain.
        if (this.rank[rootA] < this.rank[rootB]) [rootA, rootB] = [rootB, rootA];
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) this.rank[rootA]++;
        return true;
    }

    connected(a, b) {
        return this.find(a) === this.find(b);
    }
}

const names = ["Alice", "Bob", "Chen", "Diya", "Emeka", "Farah"];
const uf = new UnionFind(names.length);

// Friend requests accepted, one by one
uf.union(0, 1); // Alice - Bob
uf.union(1, 2); // Bob - Chen
uf.union(3, 4); // Diya - Emeka

console.log(uf.connected(0, 2)); // true  (Alice -> Bob -> Chen)
console.log(uf.connected(0, 3)); // false (separate friend circles)

uf.union(2, 3); // Chen - Diya, the two circles merge
console.log(uf.connected(0, 4)); // true  (one big circle now)
