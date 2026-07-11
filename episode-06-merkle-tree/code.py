import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, from leaf hashes up to the root."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate the odd one out
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_root(tree):
    return tree[-1][0]


def get_proof(tree, index):
    """Collects the sibling hash needed at each level to rebuild the root."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        is_right = index % 2 == 1
        sibling = level[index - 1] if is_right else level[index + 1]
        proof.append((sibling, "left" if is_right else "right"))
        index //= 2
    return proof


def verify_proof(leaf_data, proof, root):
    current = _hash(leaf_data)
    for sibling_hash, side in proof:
        current = _hash(sibling_hash + current) if side == "left" else _hash(current + sibling_hash)
    return current == root


if __name__ == "__main__":
    files = ["invoice_1.pdf", "invoice_2.pdf", "invoice_3.pdf", "invoice_4.pdf"]
    tree = build_merkle_tree(files)
    root = get_root(tree)

    print("Merkle Root:", root)

    # Prove invoice_3.pdf belongs, without touching the other files
    proof = get_proof(tree, 2)
    print("Valid file passes:", verify_proof(files[2], proof, root))
    print("Tampered file fails:", verify_proof("invoice_3_TAMPERED.pdf", proof, root))
