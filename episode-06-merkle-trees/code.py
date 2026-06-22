import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(blocks):
    """Builds a binary Merkle tree from data blocks.

    Returns the tree as a list of levels, level[0] = leaf hashes,
    level[-1] = [root hash].
    """
    level = [_hash(block) for block in blocks]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate odd leaf
            next_level.append(_hash((left + right).encode()))
        tree.append(next_level)
        level = next_level

    return tree


def merkle_root(blocks):
    return build_merkle_tree(blocks)[-1][0]


def find_differing_blocks(tree_a, tree_b):
    """Walks two trees of equal shape top-down, descending only into
    branches whose hash differs. Returns indices of mismatched leaves.
    """
    if tree_a[-1][0] == tree_b[-1][0]:
        return []

    # node indices to check at the current level, starting from the root
    candidates = [0]

    for depth in range(len(tree_a) - 1, 0, -1):
        next_candidates = []
        for idx in candidates:
            if tree_a[depth][idx] != tree_b[depth][idx]:
                next_candidates.append(idx * 2)
                if idx * 2 + 1 < len(tree_a[depth - 1]):
                    next_candidates.append(idx * 2 + 1)
        candidates = next_candidates

    # candidates now holds leaf indices; keep only the ones that actually differ
    return [idx for idx in candidates if tree_a[0][idx] != tree_b[0][idx]]


if __name__ == "__main__":
    file_blocks_a = [b"alpha", b"bravo", b"charlie", b"delta"]
    file_blocks_b = [b"alpha", b"bravo", b"CHARLIE-EDITED", b"delta"]

    tree_a = build_merkle_tree(file_blocks_a)
    tree_b = build_merkle_tree(file_blocks_b)

    print("Root A:", tree_a[-1][0])
    print("Root B:", tree_b[-1][0])
    print("Roots match:", tree_a[-1][0] == tree_b[-1][0])
    print("Differing block indices:", find_differing_blocks(tree_a, tree_b))
