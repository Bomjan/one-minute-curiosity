import hashlib


class HyperLogLog:
    """Estimate the number of distinct items in a stream using fixed memory."""

    HASH_BITS = 64  # digest[:8] gives an 8-byte, 64-bit hash

    def __init__(self, num_buckets_pow=10):
        self.b = num_buckets_pow
        self.m = 2 ** self.b  # number of buckets
        self.buckets = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha256(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")

    def add(self, item):
        h = self._hash(item)
        bucket_index = h & (self.m - 1)  # last b bits pick the bucket
        remaining = h >> self.b
        remaining_bits = self.HASH_BITS - self.b
        rho = self._leading_zeros(remaining, remaining_bits) + 1  # "flips until heads"
        self.buckets[bucket_index] = max(self.buckets[bucket_index], rho)

    def _leading_zeros(self, x, bits):
        if x == 0:
            return bits
        return bits - x.bit_length()

    def estimate(self):
        harmonic_sum = sum(2 ** -b for b in self.buckets)
        raw_estimate = self.alpha * self.m * self.m / harmonic_sum
        return round(raw_estimate)


if __name__ == "__main__":
    hll = HyperLogLog(num_buckets_pow=10)  # 1024 buckets

    unique_users = [f"user_{i % 50000}" for i in range(500_000)]
    for u in unique_users:
        hll.add(u)

    print("True distinct count: 50000")
    print(f"HyperLogLog estimate: {hll.estimate()}")
    print(f"Memory used: {hll.m} small integers, no matter the stream size")
