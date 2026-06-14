import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Returns every level of the tree, leaves first, root last."""
    level = [sha256(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate odd one out

        next_level = []
        for i in range(0, len(level), 2):
            next_level.append(sha256(level[i] + level[i + 1]))

        tree.append(next_level)
        level = next_level

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        if index % 2 == 1:
            proof.append(("left", level[index - 1]))
        elif index + 1 < len(level):
            proof.append(("right", level[index + 1]))
        index //= 2
    return proof


def verify_proof(leaf_hash, proof, root):
    current = leaf_hash
    for side, sibling in proof:
        current = sha256(sibling + current) if side == "left" else sha256(current + sibling)
    return current == root


if __name__ == "__main__":
    blocks = ["block_A", "block_B", "block_C", "block_D"]
    tree = build_merkle_tree(blocks)
    root = tree[-1][0]

    print("Root:", root)

    # Prove block_B (index 1) is part of the dataset
    proof = get_proof(tree, 1)
    leaf_hash = sha256(blocks[1])

    print("Valid:", verify_proof(leaf_hash, proof, root))        # True

    # Tamper with the leaf -> proof should fail
    tampered_hash = sha256("block_B_HACKED")
    print("Tampered:", verify_proof(tampered_hash, proof, root))  # False
