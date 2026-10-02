const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildTree(blocks) {
  // levels[0] = leaves, levels[last] = [root]
  let level = blocks.map((b) => h(b));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // duplicate odd tail
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.concat([level[i], level[i + 1]])));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

// Indices of differing leaves, descending only into mismatching subtrees.
function findDiffs(a, b) {
  if (a.at(-1)[0].equals(b.at(-1)[0])) return []; // roots match: identical

  let suspects = [0];
  for (let depth = a.length - 1; depth > 0; depth--) {
    const children = [];
    for (const i of suspects) {
      for (const c of [2 * i, 2 * i + 1]) {
        if (c < a[depth - 1].length && !a[depth - 1][c].equals(b[depth - 1][c])) {
          children.push(c);
        }
      }
    }
    suspects = children;
  }
  return suspects;
}

const replicaA = Array.from({ length: 1000 }, (_, i) => `block-${i}`);
const replicaB = [...replicaA];
replicaB[42] = "corrupted!";
replicaB[777] = "bit rot";

console.log(findDiffs(buildTree(replicaA), buildTree(replicaB))); // [ 42, 777 ]
