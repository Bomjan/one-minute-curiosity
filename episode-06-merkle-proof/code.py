"""Merkle tree + membership proof — prove one item belongs to a dataset
without sending the whole dataset. Powers Git, blockchains, and DB anti-entropy."""

import hashlib


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_layers(leaves):
    """Build every level of the Merkle tree, bottom (leaves) to top (root)."""
    layers = [leaves]
    current = leaves
    while len(current) > 1:
        next_level = []
        for i in range(0, len(current), 2):
            left = current[i]
            right = current[i + 1] if i + 1 < len(current) else left
            next_level.append(sha256_hex(left + right))
        layers.append(next_level)
        current = next_level
    return layers  # layers[-1][0] is the root


def get_proof(layers, index):
    """Return the sibling hash + side needed at each level to reach the root."""
    proof = []
    idx = index
    for level in layers[:-1]:
        sibling_idx = idx ^ 1
        sibling = level[sibling_idx] if sibling_idx < len(level) else level[idx]
        proof.append((sibling, idx % 2 == 1))  # True = sibling is on the left
        idx //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    computed = leaf_hash
    for sibling, sibling_is_left in proof:
        computed = sha256_hex(sibling + computed) if sibling_is_left else sha256_hex(computed + sibling)
    return computed == root


if __name__ == "__main__":
    transactions = [f"tx{i}" for i in range(8)]
    leaves = [sha256_hex(tx) for tx in transactions]
    layers = build_layers(leaves)
    root = layers[-1][0]

    index = 2  # proving "tx2" is in the dataset
    proof = get_proof(layers, index)

    print("Root:", root)
    print("Valid proof:", verify_proof(leaves[index], proof, root))            # True
    print("Tampered leaf:", verify_proof(sha256_hex("fake-tx"), proof, root))  # False
