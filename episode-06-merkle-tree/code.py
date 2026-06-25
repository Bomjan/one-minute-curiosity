"""Merkle Tree: turn 'are these two datasets identical?' into one hash comparison."""

import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks: list[str]) -> list[list[str]]:
    """Builds all levels of a Merkle tree, bottom to top. levels[-1][0] is the root."""
    if not blocks:
        return [[_hash(b"")]]

    levels = [[_hash(block.encode()) for block in blocks]]

    while len(levels[-1]) > 1:
        current = levels[-1]
        next_level = []
        for i in range(0, len(current), 2):
            left = current[i]
            right = current[i + 1] if i + 1 < len(current) else left  # duplicate odd one out
            next_level.append(_hash((left + right).encode()))
        levels.append(next_level)

    return levels


def merkle_root(blocks: list[str]) -> str:
    return build_merkle_tree(blocks)[-1][0]


if __name__ == "__main__":
    file_set_a = ["file_A", "file_B", "file_C", "file_D"]
    file_set_b = ["file_A", "file_B_EDITED", "file_C", "file_D"]

    root_a = merkle_root(file_set_a)
    root_b = merkle_root(file_set_b)

    print("Root A:", root_a)
    print("Root B:", root_b)
    print("Datasets match:", root_a == root_b)  # False - one byte changed, root changed
