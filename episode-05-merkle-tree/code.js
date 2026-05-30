import { createHash } from "crypto";

function hashBlock(data) {
  return createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
  if (blocks.length === 0) return [];

  let currentLevel = blocks.map(hashBlock);
  const levels = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // Duplicate last node if count is odd
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      nextLevel.push(hashBlock(left + right));
    }
    currentLevel = nextLevel;
    levels.push(currentLevel);
  }

  return levels;
}

function merkleRoot(blocks) {
  const levels = buildMerkleTree(blocks);
  return levels.length ? levels[levels.length - 1][0] : "";
}

function findDivergence(blocksA, blocksB) {
  const treeA = buildMerkleTree(blocksA);
  const treeB = buildMerkleTree(blocksB);

  const rootA = treeA[treeA.length - 1]?.[0];
  const rootB = treeB[treeB.length - 1]?.[0];

  if (rootA === rootB) return []; // Identical trees

  const divergent = [];
  walk(treeA, treeB, treeA.length - 1, 0, divergent);
  return divergent;
}

function walk(treeA, treeB, level, nodeIdx, divergent) {
  if (treeA[level][nodeIdx] === treeB[level][nodeIdx]) return;

  if (level === 0) {
    divergent.push(nodeIdx);
    return;
  }

  const nextLevel = level - 1;
  const leftChild = nodeIdx * 2;
  const rightChild = nodeIdx * 2 + 1;

  if (leftChild < treeA[nextLevel].length) {
    walk(treeA, treeB, nextLevel, leftChild, divergent);
  }
  if (rightChild < treeA[nextLevel].length) {
    walk(treeA, treeB, nextLevel, rightChild, divergent);
  }
}

// --- Demo ---
const datasetA = ["block0", "block1", "block2", "block3"];
const datasetB = ["block0", "CHANGED", "block2", "block3"];

const rootA = merkleRoot(datasetA);
const rootB = merkleRoot(datasetB);

console.log(`Root A: ${rootA.slice(0, 16)}...`);
console.log(`Root B: ${rootB.slice(0, 16)}...`);
console.log(`Roots match: ${rootA === rootB}`);

const changed = findDivergence(datasetA, datasetB);
console.log(`Divergent block indices: ${JSON.stringify(changed)}`); // [1]
