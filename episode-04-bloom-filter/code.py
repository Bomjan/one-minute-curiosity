import math
import mmh3  # pip install mmh3


class BloomFilter:
    def __init__(self, n_items: int, false_pos_rate: float = 0.01):
        self.size = self._optimal_size(n_items, false_pos_rate)
        self.hash_count = self._optimal_hashes(self.size, n_items)
        self.bit_array = bytearray(math.ceil(self.size / 8))

    def _optimal_size(self, n, p):
        return int(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hashes(self, m, n):
        return int((m / n) * math.log(2))

    def _bit_positions(self, item: str):
        return [mmh3.hash(item, seed) % self.size for seed in range(self.hash_count)]

    def _get_bit(self, pos):
        return (self.bit_array[pos // 8] >> (pos % 8)) & 1

    def _set_bit(self, pos):
        self.bit_array[pos // 8] |= 1 << (pos % 8)

    def add(self, item: str):
        for pos in self._bit_positions(item):
            self._set_bit(pos)

    def contains(self, item: str) -> bool:
        return all(self._get_bit(pos) for pos in self._bit_positions(item))


if __name__ == "__main__":
    bf = BloomFilter(n_items=1_000_000, false_pos_rate=0.01)

    for url in ["google.com", "github.com", "anthropic.com"]:
        bf.add(url)

    print(bf.contains("google.com"))     # True  ✅
    print(bf.contains("reddit.com"))     # False ✅ (almost certainly)
    print(bf.contains("github.com"))     # True  ✅

    size_kb = len(bf.bit_array) / 1024
    print(f"Filter size: {size_kb:.1f} KB for 1M items at 1% FPR")
    print(f"Hash functions used: {bf.hash_count}")
