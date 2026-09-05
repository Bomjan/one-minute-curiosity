"""B-Tree: the shallow, wide search tree databases build storage engines on.

A binary search tree gets tall fast (height ~ log2(n)) — fine in memory,
brutal on disk where every level is a seek. A B-tree keeps hundreds of
keys per node, so a billion-row index stays only 3-4 levels deep.
"""


class BTreeNode:
    def __init__(self, leaf=True):
        self.leaf = leaf
        self.keys = []
        self.children = []


class BTree:
    """Minimum degree t: every non-root node holds between t-1 and 2t-1 keys."""

    def __init__(self, t=2):
        self.t = t
        self.root = BTreeNode(leaf=True)

    def search(self, key, node=None):
        node = node or self.root
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if i < len(node.keys) and node.keys[i] == key:
            return True
        if node.leaf:
            return False
        return self.search(key, node.children[i])

    def insert(self, key):
        root = self.root
        # A full root can't absorb another key, so split it first and grow upward.
        if len(root.keys) == 2 * self.t - 1:
            new_root = BTreeNode(leaf=False)
            new_root.children.append(root)
            self._split_child(new_root, 0)
            self.root = new_root
        self._insert_non_full(self.root, key)

    def _split_child(self, parent, i):
        t = self.t
        child = parent.children[i]
        new_node = BTreeNode(leaf=child.leaf)

        mid_key = child.keys[t - 1]
        new_node.keys = child.keys[t:]
        child.keys = child.keys[:t - 1]

        if not child.leaf:
            new_node.children = child.children[t:]
            child.children = child.children[:t]

        parent.children.insert(i + 1, new_node)
        parent.keys.insert(i, mid_key)

    def _insert_non_full(self, node, key):
        i = len(node.keys) - 1
        if node.leaf:
            node.keys.append(None)
            while i >= 0 and key < node.keys[i]:
                node.keys[i + 1] = node.keys[i]
                i -= 1
            node.keys[i + 1] = key
        else:
            while i >= 0 and key < node.keys[i]:
                i -= 1
            i += 1
            # Split a full child before descending, so there's always room.
            if len(node.children[i].keys) == 2 * self.t - 1:
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key)

    def inorder(self, node=None):
        node = node or self.root
        result = []
        for i, key in enumerate(node.keys):
            if not node.leaf:
                result.extend(self.inorder(node.children[i]))
            result.append(key)
        if not node.leaf:
            result.extend(self.inorder(node.children[-1]))
        return result


if __name__ == "__main__":
    tree = BTree(t=2)  # each node holds at most 3 keys before splitting
    for key in [10, 20, 5, 6, 12, 30, 7, 17]:
        tree.insert(key)

    print("Sorted keys:", tree.inorder())  # [5, 6, 7, 10, 12, 17, 20, 30]
    print("Search 12:", tree.search(12))   # True
    print("Search 99:", tree.search(99))   # False
