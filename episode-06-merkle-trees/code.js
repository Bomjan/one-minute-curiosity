const crypto = require("crypto");

const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(leaves) {
    let level = leaves.map(sha);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);

        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            nextLevel.push(sha(level[i] + level[i + 1]));
        }
        tree.push(nextLevel);
        level = nextLevel;
    }
    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let level = 0; level < tree.length - 1; level++) {
        const sibling = index ^ 1;
        if (sibling < tree[level].length) proof.push(tree[level][sibling]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    let current = sha(leaf);
    for (const sibling of proof) {
        current = index % 2 === 0 ? sha(current + sibling) : sha(sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const files = ["A", "B", "C", "D"];
const tree = buildMerkleTree(files);
const root = tree[tree.length - 1][0];
console.log(`Root: ${root}`);

// Prove "B" belongs without sending the other files
const proof = getProof(tree, 1);
console.log(`B is valid: ${verifyProof("B", 1, proof, root)}`);
console.log(`Forged 'X' is valid: ${verifyProof("X", 1, proof, root)}`);
