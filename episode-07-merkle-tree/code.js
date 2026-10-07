const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildTree(records) {
  let level = records.map((r) => h(r));
  const levels = [level];
  while (level.length > 1) {
    if (level.length % 2) level = [...level, level[level.length - 1]]; // odd: duplicate last
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(h(Buffer.concat([level[i], level[i + 1]])));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

function findDiffs(a, b) {
  const ta = buildTree(a);
  const tb = buildTree(b);
  const top = ta.length - 1;
  if (ta[top][0].equals(tb[top][0])) return []; // one comparison: identical

  let frontier = [0]; // start at the root, index 0
  for (let depth = top - 1; depth >= 0; depth--) {
    const next = [];
    for (const i of frontier) {
      for (const child of [2 * i, 2 * i + 1]) {
        if (child < ta[depth].length && !ta[depth][child].equals(tb[depth][child])) {
          next.push(child);
        }
      }
    }
    frontier = next;
  }
  return frontier.filter((i) => i < a.length);
}

const replicaA = Array.from({ length: 1000 }, (_, i) => `user:${i}:balance=100`);
const replicaB = [...replicaA];
replicaB[421] = "user:421:balance=999";
replicaB[7] = "user:7:balance=0";

console.log(findDiffs(replicaA, replicaA)); // []
console.log(findDiffs(replicaA, replicaB)); // [ 7, 421 ]
