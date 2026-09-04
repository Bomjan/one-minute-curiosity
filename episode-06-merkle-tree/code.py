import hashlib


def sha(data: bytes) -> str:
    """Standard content hash used at every node of the tree."""
    return hashlib.sha256(data).hexdigest()


class MerkleTree:
    """A binary hash tree. Leaves are data blocks; every parent is the
    hash of its two children. The root is a single fingerprint for the
    entire dataset."""

    def __init__(self, blocks):
        self.leaves = [sha(block) for block in blocks]
        self.levels = self._build(self.leaves)

    def _build(self, level):
        levels = [level]
        while len(level) > 1:
            parent = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left  # odd count: duplicate last
                parent.append(sha((left + right).encode()))
            levels.append(parent)
            level = parent
        return levels

    @property
    def root(self):
        return self.levels[-1][0]

    def proof(self, index):
        """Sibling hashes along the path from a leaf to the root."""
        path = []
        idx = index
        for level in self.levels[:-1]:
            sibling = idx ^ 1
            if sibling >= len(level):
                sibling = idx
            path.append((level[sibling], idx % 2))
            idx //= 2
        return path


def verify_proof(leaf_hash, proof, root):
    """Recompute the root from a leaf + its proof, without touching the rest of the tree."""
    h = leaf_hash
    for sibling, position in proof:
        h = sha((sibling + h).encode()) if position == 1 else sha((h + sibling).encode())
    return h == root


def find_mismatches(tree_a, tree_b):
    """Locate every differing leaf between two same-shaped trees by only
    descending into branches whose hash doesn't match."""
    if tree_a.root == tree_b.root:
        return []
    return _diff(tree_a.levels, tree_b.levels, len(tree_a.levels) - 1, 0)


def _diff(levels_a, levels_b, level, index):
    if levels_a[level][index] == levels_b[level][index]:
        return []
    if level == 0:
        return [index]
    left, right = 2 * index, 2 * index + 1
    found = _diff(levels_a, levels_b, level - 1, left)
    if right < len(levels_a[level - 1]):
        found += _diff(levels_a, levels_b, level - 1, right)
    return found


if __name__ == "__main__":
    records = [f"record-{i}:balance=100".encode() for i in range(8)]

    replica_a = MerkleTree(records)

    tampered = records.copy()
    tampered[5] = b"record-5:balance=999999"  # someone quietly edited one row
    replica_b = MerkleTree(tampered)

    print("Root A:", replica_a.root[:16], "...")
    print("Root B:", replica_b.root[:16], "...")
    print("Identical?", replica_a.root == replica_b.root)

    mismatches = find_mismatches(replica_a, replica_b)
    print(f"\nDivergent leaf index found in O(log n) steps: {mismatches}")
    print(f"(compared {len(replica_a.levels) - 1} tree levels instead of {len(records)} rows)")

    # Merkle proof: prove leaf 3 belongs to replica_a without shipping the other 7 records
    leaf_index = 3
    p = replica_a.proof(leaf_index)
    ok = verify_proof(replica_a.leaves[leaf_index], p, replica_a.root)
    print(f"\nProof that record {leaf_index} is in replica_a (using {len(p)} hashes): {ok}")
