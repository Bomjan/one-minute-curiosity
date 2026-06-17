import hashlib


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_root(blocks):
    # Start with the hash of each block — the leaves
    layer = [sha256(block.encode()) for block in blocks]

    # Keep pairing and hashing until one hash remains
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])  # duplicate last hash if odd count

        layer = [
            sha256((layer[i] + layer[i + 1]).encode())
            for i in range(0, len(layer), 2)
        ]

    return layer[0]


if __name__ == "__main__":
    blocks = ["A", "B", "C", "D"]
    root = build_merkle_root(blocks)
    print("Merkle Root:", root)

    # Tamper with one block and watch the root change completely
    tampered = ["A", "B", "X", "D"]
    print("Tampered Root:", build_merkle_root(tampered))
