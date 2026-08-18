const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(sha256(level[i] + level[i + 1]));
        }
        level = next;
        tree.push(level);
    }

    return tree;
}

function findDiffIndices(leavesA, leavesB) {
    const rootA = buildMerkleTree(leavesA).at(-1)[0];
    const rootB = buildMerkleTree(leavesB).at(-1)[0];

    if (rootA === rootB) return []; // identical datasets, no diff needed

    return leavesA
        .map((leaf, i) => (leaf !== leavesB[i] ? i : -1))
        .filter((i) => i !== -1);
}

const filesA = ["f1-content", "f2-content", "f3-content", "f4-content"];
const filesB = ["f1-content", "f2-content", "f3-MODIFIED", "f4-content"];

console.log("Changed indices:", findDiffIndices(filesA, filesB)); // [2]
