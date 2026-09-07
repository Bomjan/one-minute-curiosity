"""
Merkle Tree: verify a million files match without comparing a million files.

Hash the leaves, then hash pairs of hashes upward until one root hash remains.
Two datasets are identical if (and only if) their roots match. If they don't,
walk down and only follow the branches whose hash disagrees.
"""

import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Return every level of the tree, bottom (leaves) to top (root)."""
    level = [sha256(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate odd leaf
            next_level.append(sha256(left + right))
        level = next_level
        tree.append(level)

    return tree


def find_differing_leaves(tree_a, tree_b):
    """Return indices of leaves that differ between two same-shaped trees."""
    if tree_a[-1][0] == tree_b[-1][0]:
        return []

    result = []

    def recurse(level, idx):
        if level == 0:
            result.append(idx)
            return

        layer_a, layer_b = tree_a[level - 1], tree_b[level - 1]
        left, right = idx * 2, idx * 2 + 1

        if right < len(layer_a):
            if layer_a[left] != layer_b[left]:
                recurse(level - 1, left)
            if layer_a[right] != layer_b[right]:
                recurse(level - 1, right)
        elif layer_a[left] != layer_b[left]:
            recurse(level - 1, left)

    recurse(len(tree_a) - 1, 0)
    return result


if __name__ == "__main__":
    files_a = ["file1-data", "file2-data", "file3-data", "file4-data"]
    files_b = ["file1-data", "file2-data", "file3-data-EDITED", "file4-data"]

    tree_a = build_merkle_tree(files_a)
    tree_b = build_merkle_tree(files_b)

    print("Root A:", tree_a[-1][0][:12], "...")
    print("Root B:", tree_b[-1][0][:12], "...")
    print("Differing leaf indices:", find_differing_leaves(tree_a, tree_b))  # [2]
