// Merkle Tree: prove a single chunk belongs to a huge dataset using only
// the dataset's root hash and a handful of sibling hashes (a "proof").
// Change one byte anywhere in the data, and the root hash changes too.

const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    // Build every level of the tree, from raw leaf hashes up to the root.
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        // Odd node out gets paired with a copy of itself.
        const padded = level.length % 2 ? [...level, level[level.length - 1]] : level;
        const next = [];
        for (let i = 0; i < padded.length; i += 2) {
            next.push(sha256(padded[i] + padded[i + 1]));
        }
        tree.push(next);
        level = next;
    }

    return tree;
}

function getProof(tree, index) {
    // Sibling hashes needed to rebuild the root from a single leaf.
    const proof = [];
    for (let i = 0; i < tree.length - 1; i++) {
        const level = tree[i];
        const sibling = Math.min(index % 2 === 0 ? index + 1 : index - 1, level.length - 1);
        proof.push(level[sibling]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(leaf, index, proof, root) {
    // Recompute the root using only one leaf and its proof path.
    let current = sha256(leaf);
    for (const sibling of proof) {
        current = sha256(index % 2 === 0 ? current + sibling : sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

const chunks = ["chunk-A", "chunk-B", "chunk-C", "chunk-D", "chunk-E"];

const tree = buildMerkleTree(chunks);
const root = tree[tree.length - 1][0];
console.log("Root hash:", root);

// Prove chunk-C (index 2) is really part of this dataset.
const proof = getProof(tree, 2);
console.log("Genuine chunk-C  ->", verifyProof("chunk-C", 2, proof, root));

// Same proof, tampered data — the math no longer lines up.
console.log("Tampered chunk-C ->", verifyProof("chunk-C-hacked", 2, proof, root));
