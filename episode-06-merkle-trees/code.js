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
            const right = level[i + 1] ?? left; // duplicate odd leaf
            nextLevel.push(sha256(left + right));
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

const dataA = ["block1", "block2", "block3", "block4"];
const dataB = ["block1", "block2", "block3-modified", "block4"];

const rootA = merkleRoot(dataA);
const rootB = merkleRoot(dataB);

console.log("Root A:", rootA);
console.log("Root B:", rootB);
console.log("Identical:", rootA === rootB); // false
