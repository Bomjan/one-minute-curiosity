/**
 * One Hash to Rule Them All — Merkle Trees
 *
 * Build a hash tree over a list of data blocks and prove that a single
 * block belongs to it, without revealing (or re-hashing) the rest of
 * the data. This is the same idea Git, blockchains, and BitTorrent use
 * to verify huge amounts of data with a tiny fingerprint.
 */

const crypto = require("crypto");

function hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
    let level = blocks.map(hash);
    const levels = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) next.push(hash(level[i] + level[i + 1]));
        levels.push(next);
        level = next;
    }

    return { root: level[0], levels };
}

function getMerkleProof(levels, index) {
    const proof = [];
    for (let d = 0; d < levels.length - 1; d++) {
        let level = levels[d];
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
        const siblingIndex = index ^ 1;
        proof.push({ hash: level[siblingIndex], side: siblingIndex < index ? "left" : "right" });
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyMerkleProof(leafData, proof, root) {
    let current = hash(leafData);
    for (const { hash: siblingHash, side } of proof) {
        current = side === "left" ? hash(siblingHash + current) : hash(current + siblingHash);
    }
    return current === root;
}

const blocks = ["block A", "block B", "block C", "block D"];
const { root, levels } = buildMerkleTree(blocks);
console.log("Root:", root);

const proof = getMerkleProof(levels, 1);
console.log("Valid proof for B:", verifyMerkleProof("block B", proof, root));       // true
console.log("Tampered data rejected:", verifyMerkleProof("block X", proof, root));  // false

const { root: tamperedRoot } = buildMerkleTree(["block A", "block B", "block C!", "block D"]);
console.log("Original root === tampered root:", root === tamperedRoot);  // false
