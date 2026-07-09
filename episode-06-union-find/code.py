class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        # Path compression: point every visited node straight at the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already connected

        # Union by rank: attach the shorter tree under the taller one
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    # Test 1: three separate friend groups start to merge
    uf = UnionFind(6)
    uf.union(0, 1)
    uf.union(1, 2)
    uf.union(3, 4)

    print(uf.connected(0, 2))  # True  (0-1-2 merged)
    print(uf.connected(0, 4))  # False (still separate groups)

    # Test 2: merging the groups connects everything through them
    uf.union(2, 3)
    print(uf.connected(0, 4))  # True

    # Test 3: item 5 was never touched, so it stays isolated
    print(uf.connected(0, 5))  # False
