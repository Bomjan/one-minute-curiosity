"""
Merkle Tree: prove a single chunk belongs to a huge dataset using only
the dataset's root hash and a handful of sibling hashes (a "proof").
Change one byte anywhere in the data, and the root hash changes too.
"""

import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(leaves):
    """Build every level of the tree, from raw leaf hashes up to the root.
    Returns a list of levels: tree[0] is leaf hashes, tree[-1] is [root]."""
    level = [sha256(leaf) for leaf in leaves]
    tree = [level]

    while len(level) > 1:
        # Odd node out gets paired with a copy of itself.
        padded = level + [level[-1]] if len(level) % 2 else level
        level = [sha256(padded[i] + padded[i + 1]) for i in range(0, len(padded), 2)]
        tree.append(level)

    return tree


def get_proof(tree, index):
    """Sibling hashes needed to rebuild the root from a single leaf,
    without revealing any of the other leaves."""
    proof = []
    for level in tree[:-1]:
        sibling = min(index + 1 if index % 2 == 0 else index - 1, len(level) - 1)
        proof.append(level[sibling])
        index //= 2
    return proof


def verify_proof(leaf, index, proof, root):
    """Recompute the root using only one leaf and its proof path."""
    current = sha256(leaf)
    for sibling in proof:
        current = sha256(current + sibling if index % 2 == 0 else sibling + current)
        index //= 2
    return current == root


if __name__ == "__main__":
    chunks = ["chunk-A", "chunk-B", "chunk-C", "chunk-D", "chunk-E"]

    tree = build_merkle_tree(chunks)
    root = tree[-1][0]
    print("Root hash:", root)

    # Prove chunk-C (index 2) is really part of this dataset.
    proof = get_proof(tree, 2)
    print("Genuine chunk-C  ->", verify_proof("chunk-C", 2, proof, root))

    # Same proof, tampered data — the math no longer lines up.
    print("Tampered chunk-C ->", verify_proof("chunk-C-hacked", 2, proof, root))
