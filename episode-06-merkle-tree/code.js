const crypto = require("crypto");

function h(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    let level = leaves.map(h);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(h(level[i] + level[i + 1]));
        }
        level = next;
        tree.push(level);
    }
    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        const siblingIndex = index ^ 1;
        if (siblingIndex < level.length) proof.push(level[siblingIndex]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    let current = h(leaf);
    for (const sibling of proof) {
        current = index % 2 ? h(sibling + current) : h(current + sibling);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const data = ["A", "B", "C", "D"];
const tree = buildMerkleTree(data);
const root = tree[tree.length - 1][0];

const proof = getProof(tree, 1); // prove "B" belongs
console.log("Root:", root);
console.log("Proof for B:", proof);
console.log("Valid?", verifyProof("B", 1, proof, root));     // true
console.log("Tampered?", verifyProof("X", 1, proof, root));  // false
