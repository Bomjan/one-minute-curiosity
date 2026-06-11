import random


class SkipListNode:
    def __init__(self, value, level):
        self.value = value
        self.forward = [None] * (level + 1)


class SkipList:
    def __init__(self, max_level=4, p=0.5):
        self.max_level = max_level
        self.p = p
        self.header = SkipListNode(None, max_level)
        self.level = 0

    def _random_level(self):
        # Flip a coin: heads keeps promoting to a higher express lane
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def insert(self, value):
        update = [self.header] * (self.max_level + 1)
        current = self.header

        # Walk down from the top lane, remembering where we last turned
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < value:
                current = current.forward[i]
            update[i] = current

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.header
            self.level = new_level

        new_node = SkipListNode(value, new_level)
        for i in range(new_level + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

    def search(self, target):
        current = self.header
        hops = 0

        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].value < target:
                current = current.forward[i]
                hops += 1

        current = current.forward[0]
        hops += 1

        if current and current.value == target:
            return True, hops
        return False, hops


if __name__ == "__main__":
    sl = SkipList()
    for v in [3, 6, 7, 9, 12, 19, 17, 26, 21, 25]:
        sl.insert(v)

    found, hops = sl.search(19)
    print(f"Found 19: {found} in {hops} hops")  # True, far fewer than 10

    found, hops = sl.search(100)
    print(f"Found 100: {found} in {hops} hops")  # False
