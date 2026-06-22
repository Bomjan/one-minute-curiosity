const crypto = require("crypto");

function hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(hash);
    const tree = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1] !== undefined ? level[i + 1] : left; // duplicate odd leaf
            nextLevel.push(hash(left + right));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }

    return tree;
}

function merkleRoot(blocks) {
    const tree = buildMerkleTree(blocks);
    return tree[tree.length - 1][0];
}

function findDifferingBlocks(treeA, treeB) {
    const topA = treeA[treeA.length - 1][0];
    const topB = treeB[treeB.length - 1][0];
    if (topA === topB) return [];

    let candidates = [0];

    for (let depth = treeA.length - 1; depth > 0; depth--) {
        const nextCandidates = [];
        for (const idx of candidates) {
            if (treeA[depth][idx] !== treeB[depth][idx]) {
                nextCandidates.push(idx * 2);
                if (idx * 2 + 1 < treeA[depth - 1].length) {
                    nextCandidates.push(idx * 2 + 1);
                }
            }
        }
        candidates = nextCandidates;
    }

    // candidates now holds leaf indices; keep only the ones that actually differ
    return candidates.filter((idx) => treeA[0][idx] !== treeB[0][idx]);
}

const fileBlocksA = ["alpha", "bravo", "charlie", "delta"];
const fileBlocksB = ["alpha", "bravo", "CHARLIE-EDITED", "delta"];

const treeA = buildMerkleTree(fileBlocksA);
const treeB = buildMerkleTree(fileBlocksB);

console.log("Root A:", treeA[treeA.length - 1][0]);
console.log("Root B:", treeB[treeB.length - 1][0]);
console.log("Roots match:", treeA[treeA.length - 1][0] === treeB[treeB.length - 1][0]);
console.log("Differing block indices:", findDifferingBlocks(treeA, treeB));
