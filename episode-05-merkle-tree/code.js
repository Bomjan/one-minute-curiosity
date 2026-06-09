const crypto = require("crypto");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class MerkleTree {
  // Builds a binary hash tree so a single root hash can vouch for an entire dataset.
  constructor(items) {
    this.leaves = items.map((item) => sha256(item));
    this.levels = this.#build(this.leaves);
  }

  #build(leaves) {
    const levels = [leaves];
    let current = leaves;
    while (current.length > 1) {
      if (current.length % 2 === 1) {
        current = [...current, current[current.length - 1]]; // duplicate last node if odd
      }
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        next.push(sha256(current[i] + current[i + 1]));
      }
      levels.push(next);
      current = next;
    }
    return levels;
  }

  get root() {
    return this.levels[this.levels.length - 1][0];
  }

  // Returns the sibling hashes needed to recompute the root for leaves[index].
  getProof(index) {
    const proof = [];
    for (let level = 0; level < this.levels.length - 1; level++) {
      const nodes = this.levels[level];
      if (index % 2 === 0) {
        const siblingIndex = index + 1 < nodes.length ? index + 1 : index;
        proof.push([nodes[siblingIndex], "right"]);
      } else {
        proof.push([nodes[index - 1], "left"]);
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }
}

function verifyProof(leafHash, proof, root) {
  let current = leafHash;
  for (const [sibling, side] of proof) {
    current = side === "right" ? sha256(current + sibling) : sha256(sibling + current);
  }
  return current === root;
}

const transactions = ["Alice->Bob:10", "Bob->Carol:5", "Carol->Dave:2", "Dave->Alice:1"];
const tree = new MerkleTree(transactions);
console.log("Root:", tree.root);

// Prove transaction[1] belongs to the tree without sharing the rest of the data
const leafHash = tree.leaves[1];
const proof = tree.getProof(1);
console.log("Proof valid:", verifyProof(leafHash, proof, tree.root));

// Now tamper with a single transaction
const tampered = new MerkleTree(["Alice->Bob:10", "Bob->Carol:500", "Carol->Dave:2", "Dave->Alice:1"]);
console.log("Tampered root:", tampered.root);
console.log("Roots match:", tree.root === tampered.root);
