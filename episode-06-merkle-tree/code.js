const crypto = require("crypto");

function sha(data) {
  // Standard content hash used at every node of the tree.
  return crypto.createHash("sha256").update(data).digest("hex");
}

class MerkleTree {
  constructor(blocks) {
    this.leaves = blocks.map(b => sha(b));
    this.levels = this._build(this.leaves);
  }

  _build(level) {
    const levels = [level];
    while (level.length > 1) {
      const parent = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left; // odd count: duplicate last
        parent.push(sha(left + right));
      }
      levels.push(parent);
      level = parent;
    }
    return levels;
  }

  get root() {
    return this.levels[this.levels.length - 1][0];
  }

  proof(index) {
    // Sibling hashes along the path from a leaf to the root.
    const path = [];
    let idx = index;
    for (let l = 0; l < this.levels.length - 1; l++) {
      const level = this.levels[l];
      let sibling = idx ^ 1;
      if (sibling >= level.length) sibling = idx;
      path.push([level[sibling], idx % 2]);
      idx = Math.floor(idx / 2);
    }
    return path;
  }
}

function verifyProof(leafHash, proof, root) {
  // Recompute the root from a leaf + its proof, without touching the rest of the tree.
  let h = leafHash;
  for (const [sibling, position] of proof) {
    h = position === 1 ? sha(sibling + h) : sha(h + sibling);
  }
  return h === root;
}

function findMismatches(treeA, treeB) {
  // Locate every differing leaf by only descending into branches whose hash doesn't match.
  if (treeA.root === treeB.root) return [];
  return diff(treeA.levels, treeB.levels, treeA.levels.length - 1, 0);
}

function diff(levelsA, levelsB, level, index) {
  if (levelsA[level][index] === levelsB[level][index]) return [];
  if (level === 0) return [index];
  const left = 2 * index;
  const right = 2 * index + 1;
  let found = diff(levelsA, levelsB, level - 1, left);
  if (right < levelsA[level - 1].length) {
    found = found.concat(diff(levelsA, levelsB, level - 1, right));
  }
  return found;
}

const records = Array.from({ length: 8 }, (_, i) => `record-${i}:balance=100`);

const replicaA = new MerkleTree(records);

const tampered = [...records];
tampered[5] = "record-5:balance=999999"; // someone quietly edited one row
const replicaB = new MerkleTree(tampered);

console.log("Root A:", replicaA.root.slice(0, 16), "...");
console.log("Root B:", replicaB.root.slice(0, 16), "...");
console.log("Identical?", replicaA.root === replicaB.root);

const mismatches = findMismatches(replicaA, replicaB);
console.log(`\nDivergent leaf index found in O(log n) steps: [${mismatches}]`);
console.log(`(compared ${replicaA.levels.length - 1} tree levels instead of ${records.length} rows)`);

// Merkle proof: prove leaf 3 belongs to replicaA without shipping the other 7 records
const leafIndex = 3;
const p = replicaA.proof(leafIndex);
const ok = verifyProof(replicaA.leaves[leafIndex], p, replicaA.root);
console.log(`\nProof that record ${leafIndex} is in replicaA (using ${p.length} hashes): ${ok}`);
