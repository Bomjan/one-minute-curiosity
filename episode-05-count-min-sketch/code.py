import hashlib
import math


class CountMinSketch:
    def __init__(self, epsilon: float = 0.01, delta: float = 0.01):
        self.w = math.ceil(math.e / epsilon)
        self.d = math.ceil(math.log(1 / delta))
        self.table = [[0] * self.w for _ in range(self.d)]
        self.total = 0

    def _hash(self, item: str, row: int) -> int:
        digest = hashlib.md5(f"{row}:{item}".encode()).hexdigest()
        return int(digest, 16) % self.w

    def update(self, item: str, count: int = 1):
        self.total += count
        for row in range(self.d):
            self.table[row][self._hash(item, row)] += count

    def query(self, item: str) -> int:
        return min(self.table[row][self._hash(item, row)] for row in range(self.d))

    def __repr__(self):
        return (
            f"CountMinSketch(w={self.w}, d={self.d}, "
            f"cells={self.w * self.d}, total_items={self.total})"
        )


if __name__ == "__main__":
    cms = CountMinSketch(epsilon=0.01, delta=0.01)
    print(cms)

    stream = ["#WorldCup"] * 500 + ["#AI"] * 200 + ["#Python"] * 80 + ["#Rust"] * 15

    for token in stream:
        cms.update(token)

    print(f"#WorldCup  → {cms.query('#WorldCup')}")   # ~500
    print(f"#AI        → {cms.query('#AI')}")          # ~200
    print(f"#Python    → {cms.query('#Python')}")      # ~80
    print(f"#Rust      → {cms.query('#Rust')}")        # ~15
    print(f"#Java      → {cms.query('#Java')}")        # ~0 (not inserted)
