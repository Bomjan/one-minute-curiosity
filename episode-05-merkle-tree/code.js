const crypto = require("crypto");

function hashData(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function buildMerkleTree(blocks) {
  if (!blocks.length) return [];

  let layer = blocks.map(hashData);
  if (layer.length % 2 === 1) layer.push(layer[layer.length - 1]);

  const tree = [layer];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(hashData(layer[i] + layer[i + 1]));
    }
    layer = next;
    tree.push(layer);
  }
  return tree;
}

function merkleRoot(blocks) {
  const tree = buildMerkleTree(blocks);
  return tree.length ? tree.at(-1)[0] : "";
}

function merkleProof(blocks, index) {
  const tree = buildMerkleTree(blocks);
  const proof = [];

  for (let i = 0; i < tree.length - 1; i++) {
    const layer = tree[i];
    const sibling = Math.min(index ^ 1, layer.length - 1);
    const direction = index % 2 === 0 ? "right" : "left";
    proof.push({ direction, hash: layer[sibling] });
    index = Math.floor(index / 2);
  }
  return proof;
}

function verifyProof(block, proof, root) {
  let current = hashData(block);

  for (const { direction, hash } of proof) {
    current = direction === "right"
      ? hashData(current + hash)
      : hashData(hash + current);
  }
  return current === root;
}

// Demo
const blocks = ["Transaction A", "Transaction B", "Transaction C", "Transaction D"];
const root = merkleRoot(blocks);
console.log(`Merkle Root: ${root.slice(0, 20)}...`);

const proof = merkleProof(blocks, 2);
console.log("Block C authentic:", verifyProof(blocks[2], proof, root));   // true
console.log("Tampered authentic:", verifyProof("Bad Data", proof, root)); // false
