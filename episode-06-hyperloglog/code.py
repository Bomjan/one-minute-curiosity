import hashlib


class HyperLogLog:
    HASH_BITS = 128  # an MD5 digest is 128 bits wide

    def __init__(self, num_buckets=16):
        self.m = num_buckets
        self.bucket_bits = num_buckets.bit_length() - 1   # log2(m), m must be a power of 2
        self.value_bits = self.HASH_BITS - self.bucket_bits
        self.registers = [0] * num_buckets

    def _hash(self, item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)

    def add(self, item):
        h = self._hash(item)
        bucket = h & (self.m - 1)              # low bits pick the bucket
        rest = h >> self.bucket_bits            # remaining value_bits-wide number
        leading_zeros = self.value_bits - rest.bit_length()
        rank = leading_zeros + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def estimate(self):
        alpha = 0.7213 / (1 + 1.079 / self.m)
        raw = alpha * self.m**2 / sum(2.0 ** -r for r in self.registers)
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(num_buckets=64)
    true_unique = set()

    for i in range(50_000):
        visitor = f"user-{i % 12000}"          # only 12,000 truly unique
        hll.add(visitor)
        true_unique.add(visitor)

    print("Exact count: ", len(true_unique))
    print("HLL estimate:", hll.estimate())
