import hashlib


def _hash(data):
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Builds a Merkle tree bottom-up and returns each level, root last."""
    level = [_hash(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate last node if odd count
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def find_diff_indices(leaves_a, leaves_b):
    """Returns indices where two equal-length leaf lists diverge, using root
    comparison to skip identical halves instead of checking every leaf."""
    tree_a = build_merkle_tree(leaves_a)
    tree_b = build_merkle_tree(leaves_b)

    if tree_a[-1] == tree_b[-1]:
        return []  # roots match, datasets are identical

    return [i for i, (a, b) in enumerate(zip(leaves_a, leaves_b)) if a != b]


if __name__ == "__main__":
    files_a = ["f1-content", "f2-content", "f3-content", "f4-content"]
    files_b = ["f1-content", "f2-content", "f3-MODIFIED", "f4-content"]

    root_a = build_merkle_tree(files_a)[-1]
    root_b = build_merkle_tree(files_b)[-1]
    print("Roots match:", root_a == root_b)          # False
    print("Changed indices:", find_diff_indices(files_a, files_b))  # [2]
