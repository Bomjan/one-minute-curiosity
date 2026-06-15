"""
HyperLogLog: estimate the number of *unique* items in a massive stream
using only a few kilobytes of memory.
"""

import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                      # bits used to pick a bucket
        self.m = 1 << b                 # number of buckets (2^b)
        self.buckets = [0] * self.m
        # bias-correction constant, tuned for the number of buckets
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha256(str(item).encode()).hexdigest()
        return int(digest, 16)

    def _leading_zeros(self, x, max_bits=256):
        if x == 0:
            return max_bits
        count = 0
        bit = max_bits - 1
        while bit >= 0 and not (x >> bit) & 1:
            count += 1
            bit -= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket_index = x & (self.m - 1)        # last b bits choose the bucket
        remainder = x >> self.b                # the rest of the hash
        run = self._leading_zeros(remainder, max_bits=256 - self.b) + 1
        # keep the longest "run of zeros" ever seen for this bucket
        self.buckets[bucket_index] = max(self.buckets[bucket_index], run)

    def count(self):
        z = sum(2 ** -r for r in self.buckets)
        return round(self.alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 buckets
    unique_items = set()

    for i in range(100_000):
        item = f"user_{i % 50_000}"   # only 50,000 distinct users
        hll.add(item)
        unique_items.add(item)

    actual = len(unique_items)
    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique count:   {actual}")
    print(f"HyperLogLog estimate:  {estimate}")
    print(f"Error:                 {error:.2f}%")
    print(f"Memory: {hll.m} tiny counters vs. {actual} stored items")
