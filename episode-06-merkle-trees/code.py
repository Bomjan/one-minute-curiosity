import hashlib


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks: list[bytes]) -> list[list[str]]:
    """Builds all levels of the tree, from leaves up to the root."""
    level = [sha256(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate odd leaf
            next_level.append(sha256((left + right).encode()))
        tree.append(next_level)
        level = next_level

    return tree


def merkle_root(blocks: list[bytes]) -> str:
    return build_merkle_tree(blocks)[-1][0]


if __name__ == "__main__":
    data_a = [b"block1", b"block2", b"block3", b"block4"]
    data_b = [b"block1", b"block2", b"block3-modified", b"block4"]

    root_a = merkle_root(data_a)
    root_b = merkle_root(data_b)

    print("Root A:", root_a)
    print("Root B:", root_b)
    print("Identical:", root_a == root_b)  # False — one block changed
