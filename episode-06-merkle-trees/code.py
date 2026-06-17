"""
Merkle Tree: prove one block belongs to a huge dataset
without sending (or hashing) the whole dataset.
"""

import hashlib


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks):
    """Return all levels of the tree, leaves first, root last."""
    level = [sha256(block.encode()) for block in blocks]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])  # duplicate the odd one out

        next_level = []
        for i in range(0, len(level), 2):
            combined = level[i] + level[i + 1]
            next_level.append(sha256(combined.encode()))

        tree.append(next_level)
        level = next_level

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to recompute the root from one leaf."""
    proof = []
    for level in tree[:-1]:
        if index % 2 == 1:
            sibling, position = level[index - 1], "left"
        else:
            sibling_index = index + 1 if index + 1 < len(level) else index
            sibling, position = level[sibling_index], "right"
        proof.append((sibling, position))
        index //= 2
    return proof


def verify_proof(block, proof, root):
    """Walk the proof bottom-up; the result must match the published root."""
    current = sha256(block.encode())
    for sibling, position in proof:
        combined = sibling + current if position == "left" else current + sibling
        current = sha256(combined.encode())
    return current == root


if __name__ == "__main__":
    blocks = ["block-A", "block-B", "block-C", "block-D", "block-E"]

    tree = build_merkle_tree(blocks)
    root = tree[-1][0]
    print("Root:", root)

    # Prove block-C (index 2) belongs to the set, without touching the rest.
    proof = get_proof(tree, 2)
    print("Valid proof:", verify_proof("block-C", proof, root))

    # Tamper with the data: the same proof now fails.
    print("Tampered data:", verify_proof("block-C-fake", proof, root))
