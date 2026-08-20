"""
HyperLogLog: estimate the number of distinct items in a stream
using a fixed, tiny amount of memory (no matter how big the stream is).
"""

import hashlib


class HyperLogLog:
    def __init__(self, b=4):
        self.b = b                      # bucket-index bits
        self.m = 1 << b                 # number of buckets (16 here)
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash_bits(self, item):
        # 32-bit hash, rendered as a fixed-width binary string
        digest = hashlib.md5(str(item).encode()).digest()
        h = int.from_bytes(digest[:4], "big")
        return format(h, "032b")

    def add(self, item):
        bits = self._hash_bits(item)
        bucket = int(bits[:self.b], 2)                # first b bits -> bucket index
        rest = bits[self.b:]
        rank = len(rest) - len(rest.lstrip("0")) + 1   # leading zeros + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        estimate = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=4)
    users = [f"user_{i % 5000}" for i in range(50_000)]  # 5,000 unique users

    for u in users:
        hll.add(u)

    print("True distinct count:", len(set(users)))
    print("HyperLogLog estimate:", hll.count())
