import math
import hashlib


class BloomFilter:
    def __init__(self, capacity: int, false_positive_rate: float = 0.01):
        # Optimal bit array size: m = -n * ln(p) / (ln(2)^2)
        self.size = math.ceil(
            -capacity * math.log(false_positive_rate) / (math.log(2) ** 2)
        )
        # Optimal number of hash functions: k = (m/n) * ln(2)
        self.hash_count = max(1, round((self.size / capacity) * math.log(2)))

        self.bits = bytearray(math.ceil(self.size / 8))
        self.capacity = capacity
        self.fp_rate = false_positive_rate

    def _hashes(self, item: str):
        """Generate k independent hash positions using double hashing."""
        encoded = item.encode("utf-8")
        h1 = int(hashlib.md5(encoded).hexdigest(), 16)
        h2 = int(hashlib.sha1(encoded).hexdigest(), 16)
        for i in range(self.hash_count):
            yield (h1 + i * h2) % self.size

    def _set_bit(self, index: int):
        self.bits[index // 8] |= 1 << (index % 8)

    def _get_bit(self, index: int) -> bool:
        return bool(self.bits[index // 8] & (1 << (index % 8)))

    def add(self, item: str):
        for pos in self._hashes(item):
            self._set_bit(pos)

    def contains(self, item: str) -> bool:
        """Returns False = definitely not present. True = probably present."""
        return all(self._get_bit(pos) for pos in self._hashes(item))


if __name__ == "__main__":
    bf = BloomFilter(capacity=1000, false_positive_rate=0.01)

    emails = ["alice@example.com", "bob@example.com", "charlie@example.com"]
    for email in emails:
        bf.add(email)

    print("=== Bloom Filter Demo ===\n")

    test_cases = [
        ("alice@example.com", True),
        ("bob@example.com", True),
        ("charlie@example.com", True),
        ("dave@example.com", False),
        ("eve@example.com", False),
        ("frank@example.com", False),
    ]

    for email, was_inserted in test_cases:
        result = bf.contains(email)
        label = "Probably YES" if result else "Definitely NO"
        status = "✓" if result == was_inserted else "✗ (false positive)"
        print(f"  {email:<30} → {label}  {status}")

    print(f"\nBit array size : {bf.size:,} bits ({bf.size // 8:,} bytes)")
    print(f"Hash functions : {bf.hash_count}")
    print(f"Target FP rate : {bf.fp_rate:.1%}")

    # False positive rate test over 10,000 random non-inserted strings
    import random, string

    def random_email():
        user = "".join(random.choices(string.ascii_lowercase, k=10))
        return f"{user}@notinserted.com"

    trials = 10_000
    false_positives = sum(
        1 for _ in range(trials)
        if bf.contains(random_email())
    )
    print(f"\nMeasured FP rate : {false_positives / trials:.2%} over {trials:,} trials")
