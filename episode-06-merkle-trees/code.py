import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Returns all levels of the tree, from leaves to root."""
    level = [sha256(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate last odd node
            next_level.append(sha256(left + right))
        level = next_level
        tree.append(level)

    return tree


def merkle_root(blocks):
    return build_merkle_tree(blocks)[-1][0]


if __name__ == "__main__":
    blocks = ["A", "B", "C", "D"]
    tree = build_merkle_tree(blocks)

    print("Root:", tree[-1][0])

    # Simulate one block changing
    blocks_changed = ["A", "B", "C", "D-modified"]
    print("Root after change:", merkle_root(blocks_changed))
