const crypto = require('crypto');

function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function buildMerkleTree(leaves) {
    // Build a Merkle tree from data blocks. Returns levels bottom-up: [leaves, ..., root].
    let level = leaves.map(hash);
    const tree = [level];
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate lone leaf
            next.push(hash(left + right));
        }
        level = next;
        tree.push(level);
    }
    return tree;
}

function merkleRoot(leaves) {
    const tree = buildMerkleTree(leaves);
    return tree[tree.length - 1][0];
}

function findMismatches(leavesA, leavesB) {
    // Return indices of blocks that differ between two equal-length datasets,
    // skipping every subtree whose hash already matches.
    const treeA = buildMerkleTree(leavesA);
    const treeB = buildMerkleTree(leavesB);
    const top = treeA.length - 1;

    if (treeA[top][0] === treeB[top][0]) return [];

    const mismatched = [];

    function walk(level, index) {
        const hashA = treeA[level][index];
        const hashB = treeB[level][index];
        if (hashA === hashB) return; // entire subtree is identical, no need to look deeper
        if (level === 0) {
            mismatched.push(index);
            return;
        }
        walk(level - 1, index * 2);
        walk(level - 1, index * 2 + 1);
    }

    walk(top, 0);
    return mismatched;
}

const blocksA = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
const blocksB = ['alpha', 'bravo', 'charlie', 'DELTA-CORRUPTED', 'echo', 'foxtrot', 'golf', 'hotel'];

console.log('Root A:', merkleRoot(blocksA));
console.log('Root B:', merkleRoot(blocksB));
console.log('Mismatched block indices:', findMismatches(blocksA, blocksB)); // [3]
console.log('Identical dataset mismatches:', findMismatches(blocksA, blocksA)); // []
