const { createHash } = require("crypto");

const h = (...parts) => {
  const hash = createHash("sha256");
  parts.forEach((p) => hash.update(p));
  return hash.digest();
};

function buildTree(blocks) {
  // 0x00 prefix: leaf domain
  let level = blocks.map((b) => h(Buffer.from([0]), b));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // odd: duplicate last
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.from([1]), level[i], level[i + 1]));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

// Indices of differing blocks, found by descending only into mismatches.
function diff(a, b) {
  if (a.at(-1)[0].equals(b.at(-1)[0])) return [];
  let suspects = [0];
  for (let depth = a.length - 2; depth >= 0; depth--) {
    const next = [];
    for (const i of suspects) {
      for (const child of [2 * i, 2 * i + 1]) {
        if (child < a[depth].length && !a[depth][child].equals(b[depth][child])) {
          next.push(child);
        }
      }
    }
    suspects = next;
  }
  return suspects;
}

const replicaA = Array.from({ length: 8 }, (_, i) => Buffer.from(`block-${i}`));
const replicaB = [...replicaA];
replicaB[5] = Buffer.from("block-5-CORRUPTED");

const ta = buildTree(replicaA);
const tb = buildTree(replicaB);
console.log("Roots equal?", ta.at(-1)[0].equals(tb.at(-1)[0])); // false
console.log("Differing blocks:", diff(ta, tb)); // [ 5 ]
console.log("Identical replicas:", diff(ta, buildTree(replicaA))); // []
