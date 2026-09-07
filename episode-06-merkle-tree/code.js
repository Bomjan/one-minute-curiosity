/**
 * Merkle Tree: verify a million files match without comparing a million files.
 *
 * Hash the leaves, then hash pairs of hashes upward until one root hash remains.
 * Two datasets are identical if (and only if) their roots match. If they don't,
 * walk down and only follow the branches whose hash disagrees.
 */

const crypto = require("crypto");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(leaves) {
    // Return every level of the tree, bottom (leaves) to top (root).
    let level = leaves.map(sha256);
    const tree = [level];

    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : left; // duplicate odd leaf
            nextLevel.push(sha256(left + right));
        }
        level = nextLevel;
        tree.push(level);
    }

    return tree;
}

function findDifferingLeaves(treeA, treeB) {
    // Return indices of leaves that differ between two same-shaped trees.
    if (treeA[treeA.length - 1][0] === treeB[treeB.length - 1][0]) return [];

    const result = [];

    function recurse(level, idx) {
        if (level === 0) {
            result.push(idx);
            return;
        }

        const layerA = treeA[level - 1];
        const layerB = treeB[level - 1];
        const left = idx * 2;
        const right = idx * 2 + 1;

        if (right < layerA.length) {
            if (layerA[left] !== layerB[left]) recurse(level - 1, left);
            if (layerA[right] !== layerB[right]) recurse(level - 1, right);
        } else if (layerA[left] !== layerB[left]) {
            recurse(level - 1, left);
        }
    }

    recurse(treeA.length - 1, 0);
    return result;
}

const filesA = ["file1-data", "file2-data", "file3-data", "file4-data"];
const filesB = ["file1-data", "file2-data", "file3-data-EDITED", "file4-data"];

const treeA = buildMerkleTree(filesA);
const treeB = buildMerkleTree(filesB);

console.log("Root A:", treeA[treeA.length - 1][0].slice(0, 12), "...");
console.log("Root B:", treeB[treeB.length - 1][0].slice(0, 12), "...");
console.log("Differing leaf indices:", findDifferingLeaves(treeA, treeB)); // [2]
