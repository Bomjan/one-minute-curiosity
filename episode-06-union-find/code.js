class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        // Path compression: point every visited node straight at the root
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false; // already connected

        // Union by rank: attach the shorter tree under the taller one
        if (this.rank[rootA] < this.rank[rootB]) [rootA, rootB] = [rootB, rootA];
        this.parent[rootB] = rootA;
        if (this.rank[rootA] === this.rank[rootB]) this.rank[rootA]++;
        return true;
    }

    connected(a, b) {
        return this.find(a) === this.find(b);
    }
}

// Test 1: three separate friend groups start to merge
const uf = new UnionFind(6);
uf.union(0, 1);
uf.union(1, 2);
uf.union(3, 4);

console.log(uf.connected(0, 2)); // true  (0-1-2 merged)
console.log(uf.connected(0, 4)); // false (still separate groups)

// Test 2: merging the groups connects everything through them
uf.union(2, 3);
console.log(uf.connected(0, 4)); // true

// Test 3: item 5 was never touched, so it stays isolated
console.log(uf.connected(0, 5)); // false
