class UnionFind {
  // Disjoint Set Union with path compression + union by rank.
  // Answers "are these connected?" in amortized O(α(n)) — near O(1).
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x) {
    // Path compression: point every node on the way straight to the root
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

// 6 people, numbered 0-5
const dsu = new UnionFind(6);

dsu.union(0, 1);
dsu.union(1, 2);
dsu.union(4, 5);

console.log("0 and 2 connected?", dsu.connected(0, 2)); // true (0-1-2)
console.log("0 and 4 connected?", dsu.connected(0, 4)); // false
console.log("3 and 3 connected?", dsu.connected(3, 3)); // true (itself)

dsu.union(2, 4); // merge the two friend circles
console.log("After merging: 0 and 5 connected?", dsu.connected(0, 5)); // true
