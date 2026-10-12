import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_tree(blocks):
    """Return levels[0] = leaf hashes ... levels[-1] = [root]."""
    level = [h(b"\x00" + b) for b in blocks]  # 0x00 prefix: leaf domain
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(b"\x01" + level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def diff(a, b):
    """Indices of blocks that differ, found by descending only into mismatches."""
    if a[-1] == b[-1]:
        return []
    suspects = [0]
    for depth in range(len(a) - 2, -1, -1):
        nxt = []
        for i in suspects:
            for child in (2 * i, 2 * i + 1):
                if child < len(a[depth]) and a[depth][child] != b[depth][child]:
                    nxt.append(child)
        suspects = nxt
    return suspects


if __name__ == "__main__":
    replica_a = [f"block-{i}".encode() for i in range(8)]
    replica_b = list(replica_a)
    replica_b[5] = b"block-5-CORRUPTED"

    ta, tb = build_tree(replica_a), build_tree(replica_b)
    print("Roots equal?", ta[-1] == tb[-1])  # False
    print("Differing blocks:", diff(ta, tb))  # [5]
    print("Identical replicas:", diff(ta, build_tree(replica_a)))  # []
