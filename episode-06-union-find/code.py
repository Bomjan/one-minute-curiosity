"""
Disjoint Set Union (Union-Find) with path compression + union by rank.

Answers two questions on a growing set of connections, almost in O(1):
  1. are(a, b) connected?
  2. connect(a, b)
"""


class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))  # everyone starts as their own island
        self.rank = [0] * n           # rough "height" of each tree

    def find(self, x):
        # Path compression: while searching for the root, rewire every
        # node we pass straight to it, so the next lookup is instant.
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False  # already the same island, no bridge needed

        # Union by rank: hang the shorter tree under the taller one
        # so trees stay flat instead of turning into long chains.
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)


if __name__ == "__main__":
    # 6 islands, no bridges yet
    islands = DisjointSet(6)

    islands.union(0, 1)
    islands.union(1, 2)
    islands.union(3, 4)

    print(islands.connected(0, 2))  # True  -> bridged via 1
    print(islands.connected(0, 3))  # False -> separate archipelagos

    islands.union(2, 3)             # build the bridge that joins them

    print(islands.connected(0, 4))  # True  -> now one archipelago
    print(islands.connected(0, 5))  # False -> island 5 is still alone
