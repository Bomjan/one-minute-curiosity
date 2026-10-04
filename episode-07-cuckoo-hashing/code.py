class CuckooHashTable:
    """Hash table with worst-case O(1) lookups: every key lives in one of two slots."""

    def __init__(self, capacity=8, max_kicks=32):
        self.capacity = capacity
        self.max_kicks = max_kicks
        self.tables = [[None] * capacity, [None] * capacity]
        self.size = 0

    def _slot(self, which, key):
        # Two different hash functions: salt the built-in hash with the table number
        return hash((which, key)) % self.capacity

    def get(self, key, default=None):
        # At most two probes, no matter how full the table is
        for which in (0, 1):
            entry = self.tables[which][self._slot(which, key)]
            if entry is not None and entry[0] == key:
                return entry[1]
        return default

    def put(self, key, value):
        for which in (0, 1):  # update in place if the key already exists
            slot = self._slot(which, key)
            entry = self.tables[which][slot]
            if entry is not None and entry[0] == key:
                self.tables[which][slot] = (key, value)
                return

        entry, which = (key, value), 0
        for _ in range(self.max_kicks):
            slot = self._slot(which, entry[0])
            # Take the nest; the evicted entry must go to its *other* table
            entry, self.tables[which][slot] = self.tables[which][slot], entry
            if entry is None:
                self.size += 1
                return
            which = 1 - which

        # Probably a cycle: grow, rehash, and place the homeless entry
        self._rehash()
        self.put(*entry)

    def _rehash(self):
        old = [e for t in self.tables for e in t if e is not None]
        self.capacity *= 2
        self.tables = [[None] * self.capacity, [None] * self.capacity]
        self.size = 0
        for k, v in old:
            self.put(k, v)


if __name__ == "__main__":
    t = CuckooHashTable()
    for i in range(100):
        t.put(f"user{i}", i)
    print(t.get("user42"))   # 42
    print(t.get("nobody"))   # None
    print(t.size)            # 100
