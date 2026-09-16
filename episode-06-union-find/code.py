class UnionFind:
    """Tracks connected groups and answers 'are these connected?' in ~O(1)."""

    def __init__(self, n):
        self.parent = list(range(n))   # everyone starts as their own leader
        self.rank = [0] * n            # rough "tree height" for smart merging

    def find(self, x):
        # Path compression: point straight at the root while we're here,
        # so the next lookup for x (and everyone we pass) is instant.
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already in the same group

        # Union by rank: hang the shorter tree under the taller one
        # so trees stay shallow instead of turning into a long chain.
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    names = ["Alice", "Bob", "Chen", "Diya", "Emeka", "Farah"]
    uf = UnionFind(len(names))

    # Friend requests accepted, one by one
    uf.union(0, 1)  # Alice - Bob
    uf.union(1, 2)  # Bob - Chen
    uf.union(3, 4)  # Diya - Emeka

    print(uf.connected(0, 2))  # True  (Alice -> Bob -> Chen)
    print(uf.connected(0, 3))  # False (separate friend circles)

    uf.union(2, 3)  # Chen - Diya, the two circles merge
    print(uf.connected(0, 4))  # True  (one big circle now)
