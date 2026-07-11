const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(leaves) {
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(sha256(level[i] + level[i + 1]));
        }
        tree.push(next);
        level = next;
    }
    return tree;
}

const getRoot = (tree) => tree[tree.length - 1][0];

function getProof(tree, index) {
    const proof = [];
    for (let d = 0; d < tree.length - 1; d++) {
        let level = tree[d];
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const isRight = index % 2 === 1;
        const sibling = isRight ? level[index - 1] : level[index + 1];
        proof.push([sibling, isRight ? "left" : "right"]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafData, proof, root) {
    let current = sha256(leafData);
    for (const [siblingHash, side] of proof) {
        current = side === "left" ? sha256(siblingHash + current) : sha256(current + siblingHash);
    }
    return current === root;
}

// Demo
const files = ["invoice_1.pdf", "invoice_2.pdf", "invoice_3.pdf", "invoice_4.pdf"];
const tree = buildMerkleTree(files);
const root = getRoot(tree);

console.log("Merkle Root:", root);

// Prove invoice_3.pdf belongs, without touching the other files
const proof = getProof(tree, 2);
console.log("Valid file passes:", verifyProof(files[2], proof, root));
console.log("Tampered file fails:", verifyProof("invoice_3_TAMPERED.pdf", proof, root));
