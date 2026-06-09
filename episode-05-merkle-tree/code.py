import hashlib


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class MerkleTree:
    """Builds a binary hash tree so a single root hash can vouch for an entire dataset."""

    def __init__(self, items: list[str]):
        self.leaves = [_hash(item) for item in items]
        self.levels = self._build(self.leaves)

    def _build(self, leaves: list[str]) -> list[list[str]]:
        levels = [leaves]
        current = leaves
        while len(current) > 1:
            if len(current) % 2 == 1:
                current = current + [current[-1]]  # duplicate last node if odd
            current = [
                _hash(current[i] + current[i + 1])
                for i in range(0, len(current), 2)
            ]
            levels.append(current)
        return levels

    @property
    def root(self) -> str:
        return self.levels[-1][0]

    def get_proof(self, index: int) -> list[tuple[str, str]]:
        """Returns the sibling hashes needed to recompute the root for `leaves[index]`."""
        proof = []
        for level in self.levels[:-1]:
            if index % 2 == 0:
                sibling_index = index + 1 if index + 1 < len(level) else index
                proof.append((level[sibling_index], "right"))
            else:
                proof.append((level[index - 1], "left"))
            index //= 2
        return proof


def verify_proof(leaf_hash: str, proof: list[tuple[str, str]], root: str) -> bool:
    current = leaf_hash
    for sibling, side in proof:
        current = _hash(current + sibling) if side == "right" else _hash(sibling + current)
    return current == root


if __name__ == "__main__":
    transactions = ["Alice->Bob:10", "Bob->Carol:5", "Carol->Dave:2", "Dave->Alice:1"]
    tree = MerkleTree(transactions)
    print("Root:", tree.root)

    # Prove transaction[1] belongs to the tree without sharing the rest of the data
    leaf_hash = tree.leaves[1]
    proof = tree.get_proof(1)
    print("Proof valid:", verify_proof(leaf_hash, proof, tree.root))

    # Now tamper with a single transaction
    tampered = MerkleTree(["Alice->Bob:10", "Bob->Carol:500", "Carol->Dave:2", "Dave->Alice:1"])
    print("Tampered root:", tampered.root)
    print("Roots match:", tree.root == tampered.root)
