import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_levels(blocks):
    """Return every level of the tree, leaves first, root last."""
    level = [h(b) for b in blocks]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def find_diff(a, b):
    """Index of the first differing block between two datasets, or -1."""
    la, lb = build_levels(a), build_levels(b)
    if la[-1][0] == lb[-1][0]:
        return -1  # one hash comparison proves equality
    idx = 0
    for depth in range(len(la) - 2, -1, -1):  # walk down from the root
        left = idx * 2
        if left < len(la[depth]) and la[depth][left] != lb[depth][left]:
            idx = left
        else:
            idx = left + 1
    return idx


def proof(blocks, index):
    """Sibling hashes needed to prove blocks[index] belongs to the root."""
    path = []
    for level in build_levels(blocks)[:-1]:
        if len(level) % 2:
            level = level + [level[-1]]
        path.append((level[index ^ 1], index % 2))  # (sibling, am I the right child?)
        index //= 2
    return path


def verify(block, path, root):
    node = h(block)
    for sibling, is_right in path:
        node = h(sibling + node) if is_right else h(node + sibling)
    return node == root


if __name__ == "__main__":
    a = [f"block-{i}".encode() for i in range(8)]
    b = list(a)
    b[5] = b"block-5-corrupted"

    print("Roots match?      ", build_levels(a)[-1][0] == build_levels(b)[-1][0])
    print("First bad block:  ", find_diff(a, b))

    root = build_levels(a)[-1][0]
    p = proof(a, 5)
    print("Proof size:       ", len(p), "hashes for 8 blocks")
    print("Valid proof:      ", verify(a[5], p, root))
    print("Tampered proof:   ", verify(b[5], p, root))
