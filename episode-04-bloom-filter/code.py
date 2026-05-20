import hashlib
import math


class BloomFilter:
    def __init__(self, capacity, error_rate=0.01):
        self.size = self._optimal_size(capacity, error_rate)
        self.hash_count = self._optimal_hash_count(self.size, capacity)
        self.bits = bytearray(self.size)

    def _optimal_size(self, n, p):
        return int(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hash_count(self, m, n):
        return max(1, int((m / n) * math.log(2)))

    def _hashes(self, item):
        data = item.encode() if isinstance(item, str) else item
        for i in range(self.hash_count):
            digest = hashlib.md5(data + i.to_bytes(2, "big")).hexdigest()
            yield int(digest, 16) % self.size

    def add(self, item):
        for idx in self._hashes(item):
            self.bits[idx] = 1

    def __contains__(self, item):
        return all(self.bits[idx] for idx in self._hashes(item))


if __name__ == "__main__":
    bf = BloomFilter(capacity=1_000_000, error_rate=0.01)

    visited = ["google.com", "github.com", "stackoverflow.com"]
    for url in visited:
        bf.add(url)

    print("google.com" in bf)         # True
    print("amazon.com" in bf)         # False — definitely not visited
    print("stackoverflow.com" in bf)  # True

    false_positives = sum(
        1 for i in range(10_000) if f"fake-url-{i}.com" in bf
    )
    print(f"False positive rate: {false_positives / 10_000:.2%}")
    print(f"Bit array size: {bf.size:,} bits ({bf.size // 8 / 1024:.1f} KB)")
    print(f"Hash functions: {bf.hash_count}")
