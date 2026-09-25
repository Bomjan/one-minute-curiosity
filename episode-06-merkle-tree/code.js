const crypto = require('crypto');

const hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

function buildMerkleTree(blocks) {
    // Build every level of the tree, from leaves up to the root.
    let level = blocks.map(hash);
    const tree = [level];

    while (level.length > 1) {
        if (level.length % 2 === 1) level = [...level, level[level.length - 1]]; // duplicate the odd one out
        level = Array.from({ length: level.length / 2 }, (_, i) => hash(level[2 * i] + level[2 * i + 1]));
        tree.push(level);
    }

    return tree;
}

function getProof(tree, index) {
    // Sibling hashes needed to rebuild the root from a single leaf.
    const proof = [];
    for (const rawLevel of tree.slice(0, -1)) {
        const level = rawLevel.length % 2 === 1 ? [...rawLevel, rawLevel[rawLevel.length - 1]] : rawLevel;
        const siblingIndex = index ^ 1; // flip the last bit: left <-> right
        proof.push(level[siblingIndex]);
        index = Math.floor(index / 2);
    }
    return proof;
}

function verifyProof(block, proof, root, index) {
    let current = hash(block);
    for (const sibling of proof) {
        current = index % 2 === 0 ? hash(current + sibling) : hash(sibling + current);
        index = Math.floor(index / 2);
    }
    return current === root;
}

// Demo
const blocks = ['A', 'B', 'C', 'D'];
const tree = buildMerkleTree(blocks);
const root = tree[tree.length - 1][0];
console.log('Merkle Root:', root);

// Prove block "B" (index 1) belongs, without ever sending A, C, or D
const proof = getProof(tree, 1);
console.log('Valid proof:   ', verifyProof('B', proof, root, 1));  // true
console.log('Tampered block:', verifyProof('X', proof, root, 1)); // false
