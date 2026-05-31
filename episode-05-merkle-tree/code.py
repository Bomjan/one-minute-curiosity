import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class MerkleTree:
    def __init__(self, blocks: list[str]):
        self.leaves = [sha256(b) for b in blocks]
        self.root = self._build(self.leaves)

    def _build(self, nodes: list[str]) -> str:
        if len(nodes) == 1:
            return nodes[0]
        # Duplicate last node if count is odd
        if len(nodes) % 2 == 1:
            nodes = nodes + [nodes[-1]]
        parents = [sha256(nodes[i] + nodes[i + 1]) for i in range(0, len(nodes), 2)]
        return self._build(parents)


def find_diff_indices(blocks_a: list[str], blocks_b: list[str]) -> list[int]:
    """Return indices of blocks that differ between two datasets."""
    hashes_a = [sha256(b) for b in blocks_a]
    hashes_b = [sha256(b) for b in blocks_b]
    return _diff(hashes_a, hashes_b, list(range(len(blocks_a))))


def _diff(ha: list[str], hb: list[str], indices: list[int]) -> list[int]:
    if len(ha) == 1:
        return indices if ha[0] != hb[0] else []
    if len(ha) % 2 == 1:
        ha, hb = ha + [ha[-1]], hb + [hb[-1]]
    mid = len(ha) // 2
    left  = _diff(ha[:mid], hb[:mid], indices[:mid])
    right = _diff(ha[mid:], hb[mid:], indices[mid:])
    return left + right


if __name__ == "__main__":
    blocks_a = ["tx1", "tx2", "tx3", "tx4"]
    blocks_b = ["tx1", "TX2", "tx3", "TX4"]  # indices 1 and 3 differ

    tree_a = MerkleTree(blocks_a)
    tree_b = MerkleTree(blocks_b)

    print("Root A:", tree_a.root[:16], "...")
    print("Root B:", tree_b.root[:16], "...")
    print("Roots match?", tree_a.root == tree_b.root)
    print("Differing block indices:", find_diff_indices(blocks_a, blocks_b))  # [1, 3]

    # Identical datasets
    tree_c = MerkleTree(blocks_a)
    print("\nSame dataset roots match?", tree_a.root == tree_c.root)  # True
