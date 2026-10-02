import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(blocks):
    """Return levels of hashes: levels[0] = leaves, levels[-1] = [root]."""
    level = [h(b) for b in blocks]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: promote the last hash by duplicating it
            level = level + [level[-1]]
        level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def find_diffs(a, b):
    """Return indices of leaves that differ, descending only into mismatching subtrees."""
    if a[-1][0] == b[-1][0]:
        return []  # roots match: replicas are identical

    suspects = [0]  # node indices at the current level
    for depth in range(len(a) - 1, 0, -1):
        children = []
        for i in suspects:
            for c in (2 * i, 2 * i + 1):
                if c < len(a[depth - 1]) and a[depth - 1][c] != b[depth - 1][c]:
                    children.append(c)
        suspects = children
    return suspects


if __name__ == "__main__":
    n = 1000
    replica_a = [f"block-{i}".encode() for i in range(n)]
    replica_b = list(replica_a)
    replica_b[42] = b"corrupted!"
    replica_b[777] = b"bit rot"

    tree_a, tree_b = build_tree(replica_a), build_tree(replica_b)
    print(find_diffs(tree_a, tree_b))  # [42, 777]
