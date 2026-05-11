const crypto = require("crypto");

class ConsistentHashRing {
  constructor(nodes = [], virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    this.ring = new Map();
    this.sortedKeys = [];
    nodes.forEach(node => this.addNode(node));
  }

  _hash(key) {
    const hex = crypto.createHash("md5").update(key).digest("hex").slice(0, 8);
    return parseInt(hex, 16);
  }

  addNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = this._hash(`${node}#vnode${i}`);
      this.ring.set(h, node);
      this._sortedInsert(h);
    }
  }

  removeNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = this._hash(`${node}#vnode${i}`);
      this.ring.delete(h);
      this.sortedKeys = this.sortedKeys.filter(k => k !== h);
    }
  }

  getNode(key) {
    if (this.ring.size === 0) return null;
    const h = this._hash(key);
    const idx = this._bisect(h) % this.sortedKeys.length;
    return this.ring.get(this.sortedKeys[idx]);
  }

  _sortedInsert(val) {
    const idx = this._bisect(val);
    this.sortedKeys.splice(idx, 0, val);
  }

  _bisect(val) {
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      this.sortedKeys[mid] <= val ? (lo = mid + 1) : (hi = mid);
    }
    return lo;
  }
}

function distributionReport(ring, keys) {
  const counts = {};
  for (const k of keys) {
    const node = ring.getNode(k);
    counts[node] = (counts[node] || 0) + 1;
  }
  return counts;
}

const servers = ["server-A", "server-B", "server-C"];
const ring = new ConsistentHashRing(servers);
const sampleKeys = Array.from({ length: 9 }, (_, i) => `user:${i}`);

console.log("=== Routing before removing server-B ===");
sampleKeys.forEach(k => console.log(`  ${k.padEnd(12)} → ${ring.getNode(k)}`));

ring.removeNode("server-B");

console.log("\n=== Routing after removing server-B ===");
sampleKeys.forEach(k => console.log(`  ${k.padEnd(12)} → ${ring.getNode(k)}`));

console.log("\n=== Load distribution across 10,000 keys (3 servers) ===");
const ring2 = new ConsistentHashRing(servers);
const bigKeys = Array.from({ length: 10_000 }, (_, i) => `session:${i}`);
const dist = distributionReport(ring2, bigKeys);
Object.entries(dist).sort().forEach(([server, count]) => {
  const bar = "█".repeat(Math.floor(count / 100));
  console.log(`  ${server}: ${String(count).padStart(5)} keys  ${bar}`);
});

console.log("\n=== Load distribution after adding server-D ===");
ring2.addNode("server-D");
const dist2 = distributionReport(ring2, bigKeys);
Object.entries(dist2).sort().forEach(([server, count]) => {
  const bar = "█".repeat(Math.floor(count / 100));
  console.log(`  ${server}: ${String(count).padStart(5)} keys  ${bar}`);
});
