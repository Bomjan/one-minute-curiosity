import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks):
    """Builds a Merkle tree bottom-up. levels[-1][0] is the root."""
    if not blocks:
        return [[_hash(b"")]]

    level = [_hash(b) for b in blocks]
    levels = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate on odd count
            next_level.append(_hash((left + right).encode()))
        levels.append(next_level)
        level = next_level

    return levels


def merkle_root(blocks):
    return build_merkle_tree(blocks)[-1][0]


def merkle_proof(levels, index):
    """Returns the sibling hashes (and their side) needed to rebuild the root from one leaf."""
    proof = []
    for level in levels[:-1]:
        if index % 2 == 0:
            sibling_index, direction = index + 1, "right"
        else:
            sibling_index, direction = index - 1, "left"
        sibling = level[sibling_index] if sibling_index < len(level) else level[index]
        proof.append((sibling, direction))
        index //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    current = leaf_hash
    for sibling, direction in proof:
        current = _hash((current + sibling).encode()) if direction == "right" else _hash((sibling + current).encode())
    return current == root


if __name__ == "__main__":
    blocks = [b"block-A", b"block-B", b"block-C", b"block-D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print("Root:", root)

    # Prove block-B belongs, without re-hashing A, C, or D
    leaf_hash = _hash(blocks[1])
    proof = merkle_proof(tree, 1)
    print("Proof for block-B valid?", verify_proof(leaf_hash, proof, root))

    # A single flipped byte produces a completely different, rejected proof
    tampered_hash = _hash(b"block-B-tampered")
    print("Tampered block valid?", verify_proof(tampered_hash, proof, root))
