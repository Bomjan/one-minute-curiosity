class UnionFind:
    """Disjoint Set Union with path compression + union by rank.

    Answers "are these connected?" and "merge these groups" in
    amortized O(α(n)) time — effectively constant for any n
    you'll ever encounter.
    """

    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        # Path compression: point every node on the way straight to the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: int, b: int) -> bool:
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

    def connected(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    # 6 people, numbered 0-5
    dsu = UnionFind(6)

    dsu.union(0, 1)
    dsu.union(1, 2)
    dsu.union(4, 5)

    print("0 and 2 connected?", dsu.connected(0, 2))  # True (0-1-2)
    print("0 and 4 connected?", dsu.connected(0, 4))  # False
    print("3 and 3 connected?", dsu.connected(3, 3))  # True (itself)

    dsu.union(2, 4)  # merge the two friend circles
    print("After merging: 0 and 5 connected?", dsu.connected(0, 5))  # True
