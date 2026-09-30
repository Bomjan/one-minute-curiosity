import hashlib


def h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def build_levels(items):
    """Return every tree level, leaves first, root last."""
    level = [h(b"leaf:" + x.encode()) for x in items]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:  # odd count: duplicate the last node
            level = level + [level[-1]]
        level = [h(b"node:" + level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def prove(levels, index):
    """Collect the sibling hash at each level: log2(n) hashes in total."""
    proof = []
    for level in levels[:-1]:
        if len(level) % 2:
            level = level + [level[-1]]
        sibling = index ^ 1
        proof.append((level[sibling], sibling < index))  # (hash, sibling_is_left)
        index //= 2
    return proof


def verify(item, proof, root):
    node = h(b"leaf:" + item.encode())
    for sibling, sibling_is_left in proof:
        pair = sibling + node if sibling_is_left else node + sibling
        node = h(b"node:" + pair)
    return node == root


if __name__ == "__main__":
    files = [f"file-{i}.txt" for i in range(1000)]
    levels = build_levels(files)
    root = levels[-1][0]

    proof = prove(levels, 437)
    print(len(proof))                          # 10 hashes for 1000 files
    print(verify("file-437.txt", proof, root))  # True
    print(verify("file-437.TXT", proof, root))  # False
