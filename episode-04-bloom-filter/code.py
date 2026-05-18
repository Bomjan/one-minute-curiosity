import math
import hashlib


class BloomFilter:
    def __init__(self, capacity: int, false_positive_rate: float = 0.01):
        self.capacity = capacity
        self.fpr = false_positive_rate
        self.bit_count = self._optimal_bit_count(capacity, false_positive_rate)
        self.hash_count = self._optimal_hash_count(self.bit_count, capacity)
        self.bits = bytearray(math.ceil(self.bit_count / 8))

    def _optimal_bit_count(self, n: int, p: float) -> int:
        return math.ceil(-n * math.log(p) / (math.log(2) ** 2))

    def _optimal_hash_count(self, m: int, n: int) -> int:
        return max(1, round((m / n) * math.log(2)))

    def _hash_positions(self, item: str):
        positions = []
        for seed in range(self.hash_count):
            digest = hashlib.sha256(f"{seed}:{item}".encode()).hexdigest()
            pos = int(digest, 16) % self.bit_count
            positions.append(pos)
        return positions

    def add(self, item: str):
        for pos in self._hash_positions(item):
            self.bits[pos // 8] |= (1 << (pos % 8))

    def __contains__(self, item: str) -> bool:
        return all(
            self.bits[pos // 8] & (1 << (pos % 8))
            for pos in self._hash_positions(item)
        )

    def __repr__(self):
        return (
            f"BloomFilter(capacity={self.capacity}, fpr={self.fpr}, "
            f"bits={self.bit_count}, hashes={self.hash_count}, "
            f"memory={math.ceil(self.bit_count / 8 / 1024)} KB)"
        )


if __name__ == "__main__":
    bf = BloomFilter(capacity=1_000_000, false_positive_rate=0.01)
    print(bf)

    emails = ["alice@x.com", "bob@x.com", "carol@x.com"]
    for email in emails:
        bf.add(email)

    print("alice@x.com in filter:", "alice@x.com" in bf)    # True (inserted)
    print("dave@x.com in filter:", "dave@x.com" in bf)      # False (not inserted)
    print("eve@x.com in filter:", "eve@x.com" in bf)        # Probably False

    # Measure actual false positive rate on unseen items
    import random, string

    def random_email():
        name = "".join(random.choices(string.ascii_lowercase, k=8))
        return f"{name}@test.com"

    trials = 100_000
    false_positives = sum(
        1 for _ in range(trials) if random_email() in bf
    )
    print(f"\nEmpirical FPR: {false_positives / trials:.4%} (target: {bf.fpr:.0%})")
