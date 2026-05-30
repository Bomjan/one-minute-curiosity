import hashlib


def hash_block(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def build_merkle_tree(blocks: list[str]) -> list[list[str]]:
    """Build a Merkle tree bottom-up. Returns all levels, leaves first."""
    if not blocks:
        return []

    current_level = [hash_block(b) for b in blocks]
    levels = [current_level]

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            # Duplicate the last node if the count is odd (standard practice)
            right = current_level[i + 1] if i + 1 < len(current_level) else left
            next_level.append(hash_block(left + right))
        current_level = next_level
        levels.append(current_level)

    return levels


def merkle_root(blocks: list[str]) -> str:
    levels = build_merkle_tree(blocks)
    return levels[-1][0] if levels else ""


def find_divergence(blocks_a: list[str], blocks_b: list[str]) -> list[int]:
    """Return indices of blocks that differ between two datasets."""
    tree_a = build_merkle_tree(blocks_a)
    tree_b = build_merkle_tree(blocks_b)

    if tree_a[-1] == tree_b[-1]:
        return []  # Roots match — trees are identical

    divergent = []
    _walk(tree_a, tree_b, len(tree_a) - 1, 0, divergent)
    return divergent


def _walk(tree_a, tree_b, level, node_idx, divergent):
    """Recursively walk down mismatched subtrees."""
    if tree_a[level][node_idx] == tree_b[level][node_idx]:
        return  # This subtree matches — stop here

    if level == 0:
        divergent.append(node_idx)  # Leaf — found a divergent block
        return

    left_child = node_idx * 2
    right_child = node_idx * 2 + 1
    next_level = level - 1

    if left_child < len(tree_a[next_level]):
        _walk(tree_a, tree_b, next_level, left_child, divergent)
    if right_child < len(tree_a[next_level]):
        _walk(tree_a, tree_b, next_level, right_child, divergent)


if __name__ == "__main__":
    dataset_a = ["block0", "block1", "block2", "block3"]
    dataset_b = ["block0", "CHANGED", "block2", "block3"]

    root_a = merkle_root(dataset_a)
    root_b = merkle_root(dataset_b)

    print(f"Root A: {root_a[:16]}...")
    print(f"Root B: {root_b[:16]}...")
    print(f"Roots match: {root_a == root_b}")

    changed = find_divergence(dataset_a, dataset_b)
    print(f"Divergent block indices: {changed}")  # [1]
