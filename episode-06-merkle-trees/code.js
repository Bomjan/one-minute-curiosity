// Merkle Tree: prove one block belongs to a huge dataset
// without sending (or hashing) the whole dataset.

const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) {
            level = [...level, level[level.length - 1]]; // duplicate the odd one out
        }

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
        let sibling, position;
        if (index % 2 === 1) {
            sibling = level[index - 1];
            position = "left";
        } else {
            const siblingIndex = index + 1 < level.length ? index + 1 : index;
            sibling = level[siblingIndex];
            position = "right";
        }
        proof.push({ sibling, position });
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(block, proof, root) {
    let current = sha256(block);
    for (const { sibling, position } of proof) {
        current = position === "left"
            ? sha256(sibling + current)
            : sha256(current + sibling);
    }
    return current === root;
}

const blocks = ["block-A", "block-B", "block-C", "block-D", "block-E"];

const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log("Root:", root);

// Prove block-C (index 2) belongs to the set, without touching the rest.
const proof = getProof(tree, 2);
console.log("Valid proof:", verifyProof("block-C", proof, root));

// Tamper with the data: the same proof now fails.
console.log("Tampered data:", verifyProof("block-C-fake", proof, root));
