"""
LRU (Least Recently Used) Cache — O(1) get and put.

Combines a hash map (for O(1) lookup) with a doubly linked list
(for O(1) reordering) so the cache always knows, in constant time,
which item was touched least recently.
"""


class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> Node

        # Sentinel nodes avoid null checks at the boundaries
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

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_at_head(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._insert_at_head(node)

        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]


if __name__ == "__main__":
    lru = LRUCache(2)
    lru.put(1, "A")
    lru.put(2, "B")
    print(lru.get(1))   # "A"
    lru.put(3, "C")      # evicts key 2 (least recently used)
    print(lru.get(2))   # -1
    print(lru.get(3))   # "C"
