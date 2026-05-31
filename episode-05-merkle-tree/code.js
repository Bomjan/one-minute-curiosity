const { createHash } = require("crypto");

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

class MerkleTree {
  constructor(blocks) {
    this.leaves = blocks.map(sha256);
    this.root = this._build(this.leaves);
  }

  _build(nodes) {
    if (nodes.length === 1) return nodes[0];
    // Duplicate last node if count is odd
    if (nodes.length % 2 === 1) nodes = [...nodes, nodes.at(-1)];
    const parents = [];
    for (let i = 0; i < nodes.length; i += 2) {
      parents.push(sha256(nodes[i] + nodes[i + 1]));
    }
    return this._build(parents);
  }
}

function findDiffIndices(blocksA, blocksB) {
  const ha = blocksA.map(sha256);
  const hb = blocksB.map(sha256);
  return diff(ha, hb, blocksA.map((_, i) => i));
}

function diff(ha, hb, indices) {
  if (ha.length === 1) return ha[0] !== hb[0] ? indices : [];
  if (ha.length % 2 === 1) {
    ha = [...ha, ha.at(-1)];
    hb = [...hb, hb.at(-1)];
  }
  const mid = ha.length / 2;
  return [
    ...diff(ha.slice(0, mid), hb.slice(0, mid), indices.slice(0, mid)),
    ...diff(ha.slice(mid), hb.slice(mid), indices.slice(mid)),
  ];
}


const blocksA = ["tx1", "tx2", "tx3", "tx4"];
const blocksB = ["tx1", "TX2", "tx3", "TX4"]; // indices 1 and 3 differ

const treeA = new MerkleTree(blocksA);
const treeB = new MerkleTree(blocksB);

console.log("Root A:", treeA.root.slice(0, 16), "...");
console.log("Root B:", treeB.root.slice(0, 16), "...");
console.log("Roots match?", treeA.root === treeB.root);
console.log("Differing block indices:", findDiffIndices(blocksA, blocksB)); // [1, 3]

// Identical datasets
const treeC = new MerkleTree(blocksA);
console.log("\nSame dataset roots match?", treeA.root === treeC.root); // true
