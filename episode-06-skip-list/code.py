import random


class SkipListNode:
    def __init__(self, value, level):
        self.value = value
        self.forward = [None] * (level + 1)


class SkipList:
    def __init__(self, max_level=16, p=0.5):
        self.max_level = max_level
        self.p = p
        self.level = 0
        self.head = SkipListNode(None, max_level)

    def _random_level(self):
        # Keep "flipping heads" to climb levels, capped at max_level
        level = 0
        while random.random() < self.p and level < self.max_level:
            level += 1
        return level

    def insert(self, value):
        update = [self.head] * (self.max_level + 1)
        current = self.head

        # Walk down from the top, remembering the last node touched per level
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
            update[i] = current

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.head
            self.level = new_level

        node = SkipListNode(value, new_level)
        for i in range(new_level + 1):
            node.forward[i] = update[i].forward[i]
            update[i].forward[i] = node

    def search(self, value):
        current = self.head
        hops = 0

        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
                hops += 1

        current = current.forward[0]
        hops += 1
        found = current is not None and current.value == value
        return found, hops


if __name__ == "__main__":
    sl = SkipList()
    for v in [3, 6, 7, 9, 12, 19, 17, 26, 21, 25]:
        sl.insert(v)

    found, hops = sl.search(19)
    print(f"Search 19 -> found={found}, hops={hops}")

    found, hops = sl.search(15)
    print(f"Search 15 -> found={found}, hops={hops}")
