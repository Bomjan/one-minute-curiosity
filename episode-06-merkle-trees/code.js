const crypto = require("crypto");

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Build every level of a Merkle tree, from raw leaves up to the root.
function buildMerkleTree(leaves) {
  let level = leaves.map(hash);
  const tree = [level];

  while (level.length > 1) {
    if (level.length % 2 === 1) {
      level = [...level, level[level.length - 1]]; // odd count: duplicate last hash
    }
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(hash(level[i] + level[i + 1]));
    }
    tree.push(next);
    level = next;
  }

  return tree;
}

function merkleRoot(leaves) {
  const tree = buildMerkleTree(leaves);
  return tree[tree.length - 1][0];
}

// Collect the sibling hash (and its side) at each level for one leaf.
function getProof(tree, index) {
  const proof = [];
  for (let i = 0; i < tree.length - 1; i++) {
    let level = tree[i];
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
    const isRightChild = index % 2 === 1;
    const siblingIndex = isRightChild ? index - 1 : index + 1;
    proof.push({ hash: level[siblingIndex], side: isRightChild ? "left" : "right" });
    index = Math.floor(index / 2);
  }
  return proof;
}

// Recompute the root from just a leaf + its proof, no full tree needed.
function verifyProof(leaf, proof, root) {
  let current = hash(leaf);
  for (const { hash: sibling, side } of proof) {
    current = side === "left" ? hash(sibling + current) : hash(current + sibling);
  }
  return current === root;
}

const blocks = ["block-A", "block-B", "block-C", "block-D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log(`Merkle root: ${root}`);

const proof = getProof(tree, 2); // prove "block-C" belongs to the set
console.log("Genuine leaf verifies:", verifyProof("block-C", proof, root)); // true
console.log("Tampered leaf fails:  ", verifyProof("block-X", proof, root)); // false
