const crypto = require("crypto");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level.push(level[level.length - 1]);

        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            nextLevel.push(sha256(level[i] + level[i + 1]));
        }

        tree.push(nextLevel);
        level = nextLevel;
    }

    return tree;
}

function getProof(tree, index) {
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        if (index % 2 === 1) {
            proof.push(["left", level[index - 1]]);
        } else if (index + 1 < level.length) {
            proof.push(["right", level[index + 1]]);
        }
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let current = leafHash;
    for (const [side, sibling] of proof) {
        current = side === "left" ? sha256(sibling + current) : sha256(current + sibling);
    }
    return current === root;
}

const blocks = ["block_A", "block_B", "block_C", "block_D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];

console.log("Root:", root);

// Prove block_B (index 1) is part of the dataset
const proof = getProof(tree, 1);
const leafHash = sha256(blocks[1]);

console.log("Valid:", verifyProof(leafHash, proof, root));         // true

// Tamper with the leaf -> proof should fail
const tamperedHash = sha256("block_B_HACKED");
console.log("Tampered:", verifyProof(tamperedHash, proof, root));  // false
