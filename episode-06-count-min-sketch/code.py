class CountMinSketch:
    """A fixed-size grid of counters that estimates how often an item
    was seen, without ever storing the items themselves."""

    def __init__(self, width=200, depth=5):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _hash(self, item, seed):
        # A different seed per row spreads collisions across independent hashes
        h = seed
        for ch in str(item):
            h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        return h % self.width

    def add(self, item, count=1):
        for row in range(self.depth):
            col = self._hash(item, row)
            self.table[row][col] += count

    def estimate(self, item):
        # A collision can only ever inflate a row's counter, never deflate it,
        # so the smallest row is always the closest we can get to the truth.
        return min(self.table[row][self._hash(item, row)] for row in range(self.depth))


if __name__ == "__main__":
    sketch = CountMinSketch(width=50, depth=4)

    events = ["login"] * 120 + ["click"] * 45 + ["purchase"] * 8 + ["logout"] * 60
    for event in events:
        sketch.add(event)

    for event in ["login", "click", "purchase", "logout", "refund"]:
        print(f"{event}: ~{sketch.estimate(event)}")
    # login: ~120, click: ~45, purchase: ~8, logout: ~60, refund: ~0
