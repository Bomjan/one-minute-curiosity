class Node:
    """A single slot in the doubly linked list, ordered by recency."""

    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """O(1) get/put cache backed by a hash map + doubly linked list."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        # Dummy head/tail sentinels remove all the edge-case checks.
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_at_head(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._insert_at_head(node)
        return node.value

    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])

        node = Node(key, value)
        self.map[key] = node
        self._insert_at_head(node)

        if len(self.map) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]


if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, "A")
    cache.put(2, "B")
    print(cache.get(1))     # A
    cache.put(3, "C")       # evicts 2 (least recently used)
    print(cache.get(2))     # -1
    cache.put(4, "D")       # evicts 1
    print(cache.get(1))     # -1
    print(cache.get(3))     # C
    print(cache.get(4))     # D
