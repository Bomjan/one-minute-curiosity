// Merkle tree + membership proof — prove one item belongs to a dataset
// without sending the whole dataset. Powers Git, blockchains, and DB anti-entropy.

const crypto = require('crypto');

function sha256Hex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function buildLayers(leaves) {
    const layers = [leaves];
    let current = leaves;
    while (current.length > 1) {
        const next = [];
        for (let i = 0; i < current.length; i += 2) {
            const left = current[i];
            const right = i + 1 < current.length ? current[i + 1] : left;
            next.push(sha256Hex(left + right));
        }
        layers.push(next);
        current = next;
    }
    return layers; // layers[layers.length - 1][0] is the root
}

function getProof(layers, index) {
    const proof = [];
    let idx = index;
    for (let level = 0; level < layers.length - 1; level++) {
        const nodes = layers[level];
        const siblingIdx = idx ^ 1;
        const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx];
        proof.push({ sibling, siblingIsLeft: idx % 2 === 1 });
        idx = Math.floor(idx / 2);
    }
    return proof;
}

function verifyProof(leafHash, proof, root) {
    let computed = leafHash;
    for (const { sibling, siblingIsLeft } of proof) {
        computed = siblingIsLeft ? sha256Hex(sibling + computed) : sha256Hex(computed + sibling);
    }
    return computed === root;
}

const transactions = Array.from({ length: 8 }, (_, i) => `tx${i}`);
const leaves = transactions.map(sha256Hex);
const layers = buildLayers(leaves);
const root = layers[layers.length - 1][0];

const index = 2; // proving "tx2" is in the dataset
const proof = getProof(layers, index);

console.log('Root:', root);
console.log('Valid proof:', verifyProof(leaves[index], proof, root));           // true
console.log('Tampered leaf:', verifyProof(sha256Hex('fake-tx'), proof, root));  // false
