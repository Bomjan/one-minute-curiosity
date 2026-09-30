const { createHash } = require("crypto");

const h = (data) => createHash("sha256").update(data).digest();

function buildLevels(items) {
    // Prefixes keep leaf hashes and node hashes in separate domains
    let level = items.map((x) => h(Buffer.concat([Buffer.from("leaf:"), Buffer.from(x)])));
    const levels = [level];
    while (level.length > 1) {
        if (level.length % 2) level = [...level, level[level.length - 1]];
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            next.push(h(Buffer.concat([Buffer.from("node:"), level[i], level[i + 1]])));
        }
        level = next;
        levels.push(level);
    }
    return levels;
}

function prove(levels, index) {
    const proof = [];
    for (const original of levels.slice(0, -1)) {
        const level = original.length % 2 ? [...original, original[original.length - 1]] : original;
        const sibling = index ^ 1;
        proof.push({ hash: level[sibling], isLeft: sibling < index });
        index = Math.floor(index / 2);
    }
    return proof;
}

function verify(item, proof, root) {
    let node = h(Buffer.concat([Buffer.from("leaf:"), Buffer.from(item)]));
    for (const { hash, isLeft } of proof) {
        const pair = isLeft ? [hash, node] : [node, hash];
        node = h(Buffer.concat([Buffer.from("node:"), ...pair]));
    }
    return node.equals(root);
}

const files = Array.from({ length: 1000 }, (_, i) => `file-${i}.txt`);
const levels = buildLevels(files);
const root = levels[levels.length - 1][0];

const proof = prove(levels, 437);
console.log(proof.length);                          // 10 hashes for 1000 files
console.log(verify("file-437.txt", proof, root));   // true
console.log(verify("file-437.TXT", proof, root));   // false
