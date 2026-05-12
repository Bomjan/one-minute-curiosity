import math
import hashlib


class BloomFilter:
    def __init__(self, capacity, false_positive_rate=0.01):
        self.n = capacity
        self.p = false_positive_rate
        # Optimal bit array size and number of hash functions
        self.m = math.ceil(-self.n * math.log(self.p) / (math.log(2) ** 2))
        self.k = math.ceil((self.m / self.n) * math.log(2))
        self.bits = bytearray(math.ceil(self.m / 8))

    def _hash_positions(self, item):
        positions = []
        item_bytes = item.encode() if isinstance(item, str) else item
        for i in range(self.k):
            digest = hashlib.sha256(item_bytes + i.to_bytes(2, "big")).hexdigest()
            positions.append(int(digest, 16) % self.m)
        return positions

    def _set_bit(self, pos):
        self.bits[pos // 8] |= 1 << (pos % 8)

    def _get_bit(self, pos):
        return bool(self.bits[pos // 8] & (1 << (pos % 8)))

    def add(self, item):
        for pos in self._hash_positions(item):
            self._set_bit(pos)

    def __contains__(self, item):
        return all(self._get_bit(pos) for pos in self._hash_positions(item))


if __name__ == "__main__":
    bf = BloomFilter(capacity=1000, false_positive_rate=0.01)

    known_urls = ["google.com", "github.com", "python.org", "news.ycombinator.com"]
    for url in known_urls:
        bf.add(url)

    print("=== Membership checks ===")
    print(f"google.com in filter:   {('google.com' in bf)}")     # True
    print(f"github.com in filter:   {('github.com' in bf)}")     # True
    print(f"bing.com in filter:     {('bing.com' in bf)}")       # False
    print(f"facebook.com in filter: {('facebook.com' in bf)}")   # False

    print(f"\n=== Filter stats ===")
    print(f"Capacity:        {bf.n} items")
    print(f"Bit array size:  {bf.m} bits ({math.ceil(bf.m / 8)} bytes)")
    print(f"Hash functions:  {bf.k}")
    print(f"Target FP rate:  {bf.p * 100:.1f}%")

    # Empirically measure false-positive rate on random strings
    import random
    import string

    def random_url():
        slug = "".join(random.choices(string.ascii_lowercase, k=10))
        return f"{slug}.com"

    trials = 10_000
    false_positives = sum(
        1 for _ in range(trials) if random_url() in bf
    )
    print(f"\n=== Empirical false-positive rate ===")
    print(f"False positives: {false_positives}/{trials} ({false_positives/trials*100:.2f}%)")
