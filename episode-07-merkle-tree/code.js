const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

// Return every level of the tree, leaves first, root last.
function buildLevels(blocks) {
  let level = blocks.map((b) => h(b));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]];
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.concat([level[i], level[i + 1]])));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

// Index of the first differing block between two datasets, or -1.
function findDiff(a, b) {
  const la = buildLevels(a);
  const lb = buildLevels(b);
  if (la.at(-1)[0].equals(lb.at(-1)[0])) return -1;
  let idx = 0;
  for (let depth = la.length - 2; depth >= 0; depth--) {
    const left = idx * 2;
    idx = left < la[depth].length && !la[depth][left].equals(lb[depth][left]) ? left : left + 1;
  }
  return idx;
}

// Sibling hashes needed to prove blocks[index] belongs to the root.
function proof(blocks, index) {
  const path = [];
  for (const lvl of buildLevels(blocks).slice(0, -1)) {
    const level = lvl.length % 2 ? [...lvl, lvl[lvl.length - 1]] : lvl;
    path.push({ sibling: level[index ^ 1], isRight: index % 2 === 1 });
    index = Math.floor(index / 2);
  }
  return path;
}

function verify(block, path, root) {
  let node = h(block);
  for (const { sibling, isRight } of path) {
    node = h(isRight ? Buffer.concat([sibling, node]) : Buffer.concat([node, sibling]));
  }
  return node.equals(root);
}

const a = Array.from({ length: 8 }, (_, i) => `block-${i}`);
const b = [...a];
b[5] = "block-5-corrupted";

const root = buildLevels(a).at(-1)[0];
const p = proof(a, 5);
console.log("Roots match?      ", root.equals(buildLevels(b).at(-1)[0]));
console.log("First bad block:  ", findDiff(a, b));
console.log("Proof size:       ", p.length, "hashes for 8 blocks");
console.log("Valid proof:      ", verify(a[5], p, root));
console.log("Tampered proof:   ", verify(b[5], p, root));
