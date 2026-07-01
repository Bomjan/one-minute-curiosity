"""
LRU (Least Recently Used) Cache — O(1) get and put.

The trick: a hash map gives O(1) lookup but has no sense of order.
A doubly linked list gives O(1) reordering but no O(1) lookup.
Fuse them together and you get both for free.
"""


class Node:
    """A cache entry that also doubles as a linked-list node."""

    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}  # key -> Node, for O(1) lookup

        # Sentinel head/tail so we never special-case empty lists.
        # head.next -> most recently used
        # tail.prev -> least recently used
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_at_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_at_front(node)  # touching a key makes it "most recent"
        return node.value

    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._insert_at_front(node)

        if len(self.cache) > self.capacity:
            lru = self.tail.prev  # least recently used sits right before tail
            self._remove(lru)
            del self.cache[lru.key]


if __name__ == "__main__":
    lru = LRUCache(2)

    lru.put(1, "a")
    lru.put(2, "b")
    print(lru.get(1))       # "a"  -> 1 is now most recently used

    lru.put(3, "c")         # capacity full, evicts key 2 (least recently used)
    print(lru.get(2))       # -1   -> evicted

    lru.put(4, "d")         # evicts key 1
    print(lru.get(1))       # -1   -> evicted
    print(lru.get(3))       # "c"
    print(lru.get(4))       # "d"
