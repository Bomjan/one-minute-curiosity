import hashlib


def h(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(leaves):
    """Returns all levels of the tree, leaves first, root last."""
    level = [h(leaf.encode()) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate last node if odd count
        level = [h((level[i] + level[i + 1]).encode()) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to verify the leaf at `index`."""
    proof = []
    for level in tree[:-1]:
        sibling_index = index ^ 1  # flip last bit to find sibling
        if sibling_index < len(level):
            proof.append(level[sibling_index])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    current = h(leaf.encode())
    for sibling in proof:
        # left sibling comes first if our index was odd, else we're on the left
        current = h((sibling + current).encode()) if index % 2 else h((current + sibling).encode())
        index //= 2
    return current == root


if __name__ == "__main__":
    data = ["A", "B", "C", "D"]
    tree = build_merkle_tree(data)
    root = tree[-1][0]

    proof = get_proof(tree, 1)  # prove "B" belongs
    print("Root:", root)
    print("Proof for B:", proof)
    print("Valid?", verify_proof("B", 1, proof, root))      # True
    print("Tampered?", verify_proof("X", 1, proof, root))   # False
