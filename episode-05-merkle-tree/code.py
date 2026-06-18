"""Merkle tree: build a tamper-evident fingerprint for a dataset, then prove
that a single item belongs to it without revealing the rest."""

import hashlib


def _hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_merkle_tree(leaves):
    """Build the tree bottom-up. Returns a list of levels; level[0] = leaf hashes, level[-1] = [root]."""
    level = [_hash(leaf.encode()) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]          # odd row: clone the last hash to pair it up
        level = [_hash((level[i] + level[i + 1]).encode()) for i in range(0, len(level), 2)]
        tree.append(level)

    return tree


def merkle_root(tree):
    return tree[-1][0]


def build_proof(tree, index):
    """Collect the sibling hash at every level on the path from a leaf up to the root."""
    proof = []
    for level in tree[:-1]:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        sibling_index = index ^ 1
        side = "left" if sibling_index < index else "right"
        proof.append((level[sibling_index], side))
        index //= 2
    return proof


def verify_proof(leaf, proof, root):
    """Recompute the root from a single leaf and its proof. No need to see the rest of the data."""
    current = _hash(leaf.encode())
    for sibling, side in proof:
        pair = sibling + current if side == "left" else current + sibling
        current = _hash(pair.encode())
    return current == root


if __name__ == "__main__":
    files = ["index.html", "app.js", "style.css", "logo.png", "readme.md"]

    tree = build_merkle_tree(files)
    root = merkle_root(tree)
    print("Merkle root:", root)

    # Prove that "style.css" really belongs to this exact set of files
    index = files.index("style.css")
    proof = build_proof(tree, index)
    print("style.css verifies:", verify_proof("style.css", proof, root))

    # Tamper with the file: same name, different content -> proof must fail
    print("tampered verifies: ", verify_proof("style.css (modified)", proof, root))
