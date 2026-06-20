import hashlib


def hash_data(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks: list[str]) -> list[list[str]]:
    if not blocks:
        return []

    layer = [hash_data(b) for b in blocks]
    if len(layer) % 2 == 1:
        layer.append(layer[-1])

    tree = [layer]
    while len(layer) > 1:
        next_layer = [
            hash_data(layer[i] + layer[i + 1])
            for i in range(0, len(layer), 2)
        ]
        layer = next_layer
        tree.append(layer)

    return tree


def merkle_root(blocks: list[str]) -> str:
    tree = build_merkle_tree(blocks)
    return tree[-1][0] if tree else ""


def merkle_proof(blocks: list[str], index: int) -> list[tuple[str, str]]:
    tree = build_merkle_tree(blocks)
    proof = []

    for layer in tree[:-1]:
        sibling = min(index ^ 1, len(layer) - 1)
        direction = "right" if index % 2 == 0 else "left"
        proof.append((direction, layer[sibling]))
        index //= 2

    return proof


def verify_proof(block: str, proof: list[tuple[str, str]], root: str) -> bool:
    current = hash_data(block)

    for direction, sibling in proof:
        if direction == "right":
            current = hash_data(current + sibling)
        else:
            current = hash_data(sibling + current)

    return current == root


if __name__ == "__main__":
    blocks = ["Transaction A", "Transaction B", "Transaction C", "Transaction D"]

    root = merkle_root(blocks)
    print(f"Merkle Root: {root[:20]}...")

    proof = merkle_proof(blocks, 2)
    print("Block C authentic:", verify_proof(blocks[2], proof, root))    # True
    print("Tampered authentic:", verify_proof("Bad Data", proof, root))  # False
