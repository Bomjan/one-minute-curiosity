class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        // Path compression: point every node directly at the root
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

const uf = new UnionFind(6);
uf.union(0, 1);
uf.union(2, 3);
uf.union(1, 3);

console.log(`connected(0, 2) = ${uf.connected(0, 2)}`); // true
console.log(`connected(0, 4) = ${uf.connected(0, 4)}`); // false

uf.union(4, 5);
console.log(`connected(4, 5) = ${uf.connected(4, 5)}`); // true
