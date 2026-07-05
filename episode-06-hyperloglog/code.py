# Episode 06: HyperLogLog
# Estimate how many DISTINCT items passed through a stream using
# a fixed, tiny amount of memory — no matter how large the stream gets.

import math
import hashlib


def _hash(item):
    # Stable 32-bit hash so every run behaves the same way
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)


def _leading_zero_run(bits, width):
    # Count leading zeros in `bits` (as a `width`-bit binary string), +1
    binary = format(bits, f"0{width}b")
    return len(binary) - len(binary.lstrip("0")) + 1


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                     # number of bits used to pick a bucket
        self.m = 1 << b                # number of buckets, e.g. 1024
        self.buckets = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, item):
        x = _hash(item)
        bucket_index = x & (self.m - 1)       # last `b` bits choose the bucket
        remaining_bits = x >> self.b
        rank = _leading_zero_run(remaining_bits, 32 - self.b)
        self.buckets[bucket_index] = max(self.buckets[bucket_index], rank)

    def count(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.buckets)
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 buckets, ~1KB of memory

    true_unique = set()
    for i in range(1_000_000):
        value = i % 50_000  # only 50,000 truly distinct values
        hll.add(value)
        true_unique.add(value)

    print("True distinct count:", len(true_unique))
    print("HyperLogLog estimate:", hll.count())
