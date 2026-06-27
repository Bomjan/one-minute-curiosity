import hashlib


def sha(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, leaves first, root last."""
    level = [sha(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate the odd one out

        next_level = [sha(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(next_level)
        level = next_level

    return tree


def merkle_root(leaves):
    return build_merkle_tree(leaves)[-1][0]


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        sibling = index ^ 1  # flip last bit to find the pair
        if sibling < len(level):
            proof.append(level[sibling])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    current = sha(leaf)
    for sibling in proof:
        current = sha(current + sibling) if index % 2 == 0 else sha(sibling + current)
        index //= 2
    return current == root


if __name__ == "__main__":
    files = ["A", "B", "C", "D"]
    tree = build_merkle_tree(files)
    root = tree[-1][0]
    print(f"Root: {root}")

    # Prove "B" belongs without sending the other files
    proof = get_proof(tree, 1)
    print(f"B is valid: {verify_proof('B', 1, proof, root)}")
    print(f"Forged 'X' is valid: {verify_proof('X', 1, proof, root)}")
