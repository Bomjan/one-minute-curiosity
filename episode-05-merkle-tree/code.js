// Merkle tree: build a tamper-evident fingerprint for a dataset, then prove
// that a single item belongs to it without revealing the rest.

const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// Build the tree bottom-up. Returns levels[0] = leaf hashes ... levels[last] = [root]
function buildMerkleTree(leaves) {
  let level = leaves.map(sha256);
  const tree = [level];

  while (level.length > 1) {
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]]; // clone last hash to pair it up
    level = Array.from({ length: level.length / 2 }, (_, i) =>
      sha256(level[2 * i] + level[2 * i + 1])
    );
    tree.push(level);
  }

  return tree;
}

const merkleRoot = (tree) => tree[tree.length - 1][0];

// Collect the sibling hash at every level on the path from a leaf up to the root
function buildProof(tree, index) {
  const proof = [];
  for (let i = 0; i < tree.length - 1; i++) {
    let level = tree[i];
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
    const siblingIndex = index ^ 1;
    const side = siblingIndex < index ? "left" : "right";
    proof.push([level[siblingIndex], side]);
    index = Math.floor(index / 2);
  }
  return proof;
}

// Recompute the root from a single leaf and its proof — no need to see the rest of the data
function verifyProof(leaf, proof, root) {
  let current = sha256(leaf);
  for (const [sibling, side] of proof) {
    current = side === "left" ? sha256(sibling + current) : sha256(current + sibling);
  }
  return current === root;
}

const files = ["index.html", "app.js", "style.css", "logo.png", "readme.md"];

const tree = buildMerkleTree(files);
const root = merkleRoot(tree);
console.log("Merkle root:", root);

const index = files.indexOf("style.css");
const proof = buildProof(tree, index);
console.log("style.css verifies:", verifyProof("style.css", proof, root));
console.log("tampered verifies: ", verifyProof("style.css (modified)", proof, root));
