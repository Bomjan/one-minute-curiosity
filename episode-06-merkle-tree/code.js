// Merkle Tree: turn "are these two datasets identical?" into one hash comparison.
const crypto = require("crypto");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Builds all levels of a Merkle tree, bottom to top. Last level's only entry is the root.
function buildMerkleTree(blocks) {
  if (blocks.length === 0) return [[sha256("")]];

  const levels = [blocks.map((block) => sha256(block))];

  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const nextLevel = [];

    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? left; // duplicate odd one out
      nextLevel.push(sha256(left + right));
    }

    levels.push(nextLevel);
  }

  return levels;
}

function merkleRoot(blocks) {
  const levels = buildMerkleTree(blocks);
  return levels[levels.length - 1][0];
}

// Demo
const fileSetA = ["file_A", "file_B", "file_C", "file_D"];
const fileSetB = ["file_A", "file_B_EDITED", "file_C", "file_D"];

const rootA = merkleRoot(fileSetA);
const rootB = merkleRoot(fileSetB);

console.log("Root A:", rootA);
console.log("Root B:", rootB);
console.log("Datasets match:", rootA === rootB); // false
