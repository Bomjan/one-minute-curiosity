import hashlib


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Build every level of a Merkle tree, from raw leaves up to the root."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # odd count: duplicate the last hash
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def merkle_root(leaves):
    return build_merkle_tree(leaves)[-1][0]


def get_proof(tree, index):
    """Collect the sibling hash (and its side) at each level for one leaf."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        is_right_child = index % 2 == 1
        sibling_index = index - 1 if is_right_child else index + 1
        proof.append((level[sibling_index], "left" if is_right_child else "right"))
        index //= 2
    return proof


def verify_proof(leaf, proof, root):
    """Recompute the root from just a leaf + its proof, no full tree needed."""
    current = _hash(leaf)
    for sibling, side in proof:
        current = _hash(sibling + current) if side == "left" else _hash(current + sibling)
    return current == root


if __name__ == "__main__":
    blocks = ["block-A", "block-B", "block-C", "block-D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print(f"Merkle root: {root}")

    proof = get_proof(tree, 2)  # prove "block-C" belongs to the set
    print("Genuine leaf verifies:", verify_proof("block-C", proof, root))   # True
    print("Tampered leaf fails:  ", verify_proof("block-X", proof, root))   # False
