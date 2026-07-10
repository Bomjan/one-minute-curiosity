"""Count-Min Sketch: estimate how often items occur in a huge stream
using a small, fixed amount of memory instead of one counter per item."""
import hashlib


class CountMinSketch:
    def __init__(self, width=2000, depth=5):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _hash(self, item, row):
        # A different "row" acts as a different, independent hash function.
        digest = hashlib.md5(f"{row}:{item}".encode()).hexdigest()
        return int(digest, 16) % self.width

    def add(self, item, count=1):
        for row in range(self.depth):
            self.table[row][self._hash(item, row)] += count

    def estimate(self, item):
        # Collisions can only inflate a counter, never deflate it,
        # so the smallest counter across rows is the tightest estimate.
        return min(self.table[row][self._hash(item, row)] for row in range(self.depth))


if __name__ == "__main__":
    cms = CountMinSketch(width=2000, depth=5)

    traffic = (
        ["203.0.113.5"] * 9000    # a DDoS-scale attacker
        + ["198.51.100.7"] * 40   # a normal, chatty client
        + ["192.0.2.9"] * 12      # a quiet client
    )

    for ip in traffic:
        cms.add(ip)

    for ip in ["203.0.113.5", "198.51.100.7", "192.0.2.9", "10.0.0.1"]:
        print(f"{ip}: estimated {cms.estimate(ip)} requests")
