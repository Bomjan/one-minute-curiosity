"""
One Hash to Rule Them All — Merkle Trees

Build a hash tree over a list of data blocks and prove that a single
block belongs to it, without revealing (or re-hashing) the rest of
the data. This is the same idea Git, blockchains, and BitTorrent use
to verify huge amounts of data with a tiny fingerprint.
"""

import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks):
    """Returns (root_hash, levels) — levels[0] is leaf hashes, levels[-1] is [root]."""
    level = [_hash(b) for b in blocks]
    levels = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # duplicate last node if odd count
        level = [_hash(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)

    return level[0], levels


def get_merkle_proof(levels, index):
    """Sibling hashes from leaf `index` up to the root."""
    proof = []
    for level in levels[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        sibling_index = index ^ 1  # flips the last bit -> the paired sibling
        side = "left" if sibling_index < index else "right"
        proof.append((level[sibling_index], side))
        index //= 2
    return proof


def verify_merkle_proof(leaf_data, proof, root):
    current = _hash(leaf_data)
    for sibling_hash, side in proof:
        current = _hash(sibling_hash + current) if side == "left" else _hash(current + sibling_hash)
    return current == root


if __name__ == "__main__":
    blocks = ["block A", "block B", "block C", "block D"]
    root, levels = build_merkle_tree(blocks)
    print("Root:", root)

    # Prove block B (index 1) is untouched, without the rest of the data
    proof = get_merkle_proof(levels, 1)
    print("Valid proof for B:", verify_merkle_proof("block B", proof, root))       # True
    print("Tampered data rejected:", verify_merkle_proof("block X", proof, root))  # False

    # Change one block -> root changes completely
    tampered_root, _ = build_merkle_tree(["block A", "block B", "block C!", "block D"])
    print("Original root == tampered root:", root == tampered_root)  # False
