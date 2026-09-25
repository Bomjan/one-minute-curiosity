import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Build every level of the tree, from leaves up to the root."""
    level = [_hash(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate the odd one out
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to rebuild the root from a single leaf."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        sibling_index = index ^ 1  # flip the last bit: left <-> right
        proof.append(level[sibling_index])
        index //= 2
    return proof


def verify_proof(block, proof, root, index):
    current = _hash(block)
    for sibling in proof:
        current = _hash(current + sibling) if index % 2 == 0 else _hash(sibling + current)
        index //= 2
    return current == root


if __name__ == "__main__":
    blocks = ["A", "B", "C", "D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print("Merkle Root:", root)

    # Prove block "B" (index 1) belongs, without ever sending A, C, or D
    proof = get_proof(tree, 1)
    print("Valid proof:  ", verify_proof("B", proof, root, 1))  # True
    print("Tampered block:", verify_proof("X", proof, root, 1))  # False
