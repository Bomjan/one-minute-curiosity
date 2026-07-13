"""HyperLogLog: estimate the number of *distinct* items in a huge stream
using a fixed, tiny amount of memory (a handful of small counters)."""

import hashlib


class HyperLogLog:
    def __init__(self, num_bucket_bits=4):
        self.b = num_bucket_bits
        self.m = 1 << self.b  # number of buckets, e.g. 16
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)  # 128-bit integer

    def _leading_zeros(self, value, bit_width):
        if value == 0:
            return bit_width
        count = 0
        mask = 1 << (bit_width - 1)
        while value & mask == 0:
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket_index = x & (self.m - 1)              # last b bits pick the bucket
        remainder = x >> self.b                       # the rest of the bits
        run_length = self._leading_zeros(remainder, 128 - self.b) + 1
        self.registers[bucket_index] = max(self.registers[bucket_index], run_length)

    def estimate(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.registers)
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(num_bucket_bits=4)

    unique_items = [f"user_{i}" for i in range(10_000)]
    for item in unique_items:
        hll.add(item)

    # Adding duplicates should barely move the estimate.
    for item in unique_items[:5_000]:
        hll.add(item)

    print("Actual unique count:", len(set(unique_items)))
    print("HyperLogLog estimate:", hll.estimate())
