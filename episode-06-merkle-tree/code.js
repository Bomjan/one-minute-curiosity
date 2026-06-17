const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleRoot(blocks) {
    // Start with the hash of each block — the leaves
    let layer = blocks.map((block) => sha256(block));

    // Keep pairing and hashing until one hash remains
    while (layer.length > 1) {
        if (layer.length % 2 === 1) {
            layer.push(layer[layer.length - 1]); // duplicate last hash if odd
        }

        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            next.push(sha256(layer[i] + layer[i + 1]));
        }
        layer = next;
    }

    return layer[0];
}

const blocks = ["A", "B", "C", "D"];
console.log("Merkle Root:", buildMerkleRoot(blocks));

// Tamper with one block and watch the root change completely
const tampered = ["A", "B", "X", "D"];
console.log("Tampered Root:", buildMerkleRoot(tampered));
