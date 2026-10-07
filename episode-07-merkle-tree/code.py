import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(records):
    """Return tree levels: levels[0] = leaf hashes, levels[-1] = [root]."""
    level = [h(r.encode()) for r in records]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def find_diffs(a, b):
    """Indices of leaves that differ, comparing hashes top-down."""
    ta, tb = build_tree(a), build_tree(b)
    if ta[-1] == tb[-1]:
        return []  # one comparison: replicas are identical

    frontier = [0]  # start at the root, index 0
    for depth in range(len(ta) - 2, -1, -1):
        next_frontier = []
        for i in frontier:
            for child in (2 * i, 2 * i + 1):
                if child < len(ta[depth]) and ta[depth][child] != tb[depth][child]:
                    next_frontier.append(child)
        frontier = next_frontier
    return [i for i in frontier if i < len(a)]


if __name__ == "__main__":
    replica_a = [f"user:{i}:balance=100" for i in range(1000)]
    replica_b = list(replica_a)
    replica_b[421] = "user:421:balance=999"
    replica_b[7] = "user:7:balance=0"

    print(find_diffs(replica_a, replica_a))  # []
    print(find_diffs(replica_a, replica_b))  # [7, 421]
