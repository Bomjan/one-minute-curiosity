const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    if (blocks.length === 0) return [[sha256("")]];

    let level = blocks.map((b) => sha256(b));
    const levels = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate on odd count
            nextLevel.push(sha256(left + right));
        }
        levels.push(nextLevel);
        level = nextLevel;
    }

    return levels;
}

function merkleProof(levels, index) {
    const proof = [];
    for (let d = 0; d < levels.length - 1; d++) {
        const level = levels[d];
        let siblingIndex, direction;
        if (index % 2 === 0) {
            [siblingIndex, direction] = [index + 1, "right"];
        } else {
            [siblingIndex, direction] = [index - 1, "left"];
        }
        const sibling = siblingIndex < level.length ? level[siblingIndex] : level[index];
        proof.push([sibling, direction]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let current = leafHash;
    for (const [sibling, direction] of proof) {
        current = direction === "right" ? sha256(current + sibling) : sha256(sibling + current);
    }
    return current === root;
}

const blocks = ["block-A", "block-B", "block-C", "block-D"];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log("Root:", root);

// Prove block-B belongs, without re-hashing A, C, or D
const leafHash = sha256(blocks[1]);
const proof = merkleProof(tree, 1);
console.log("Proof for block-B valid?", verifyProof(leafHash, proof, root));

// A single flipped byte produces a completely different, rejected proof
const tamperedHash = sha256("block-B-tampered");
console.log("Tampered block valid?", verifyProof(tamperedHash, proof, root));
