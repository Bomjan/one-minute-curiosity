import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Build a Merkle tree from data blocks. Returns levels bottom-up: [leaves, ..., root]."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate lone leaf
            next_level.append(_hash(left + right))
        level = next_level
        tree.append(level)
    return tree


def merkle_root(leaves):
    return build_merkle_tree(leaves)[-1][0]


def find_mismatches(leaves_a, leaves_b):
    """Return indices of blocks that differ between two equal-length datasets,
    skipping every subtree whose hash already matches."""
    tree_a = build_merkle_tree(leaves_a)
    tree_b = build_merkle_tree(leaves_b)
    top = len(tree_a) - 1

    if tree_a[top][0] == tree_b[top][0]:
        return []

    mismatched = []

    def walk(level, index):
        hash_a = tree_a[level][index]
        hash_b = tree_b[level][index]
        if hash_a == hash_b:
            return  # entire subtree is identical, no need to look deeper
        if level == 0:
            mismatched.append(index)
            return
        walk(level - 1, index * 2)
        walk(level - 1, index * 2 + 1)

    walk(top, 0)
    return mismatched


if __name__ == "__main__":
    blocks_a = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"]
    blocks_b = ["alpha", "bravo", "charlie", "DELTA-CORRUPTED", "echo", "foxtrot", "golf", "hotel"]

    print("Root A:", merkle_root(blocks_a))
    print("Root B:", merkle_root(blocks_b))
    print("Mismatched block indices:", find_mismatches(blocks_a, blocks_b))  # [3]
    print("Identical dataset mismatches:", find_mismatches(blocks_a, blocks_a))  # []
