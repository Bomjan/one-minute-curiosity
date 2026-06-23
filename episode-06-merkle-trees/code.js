const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1] ?? left; // duplicate last odd node
            nextLevel.push(sha256(left + right));
        }
        level = nextLevel;
        tree.push(level);
    }

    return tree;
}

function merkleRoot(blocks) {
    const tree = buildMerkleTree(blocks);
    return tree[tree.length - 1][0];
}

// Demo
const blocks = ["A", "B", "C", "D"];
console.log("Root:", merkleRoot(blocks));

const blocksChanged = ["A", "B", "C", "D-modified"];
console.log("Root after change:", merkleRoot(blocksChanged));
