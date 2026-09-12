"""HyperLogLog: estimate the number of *distinct* items in a huge stream
using a fixed, tiny amount of memory instead of storing every item seen."""

import hashlib
import random


def _hash(value):
    """Deterministic 32-bit hash for a value."""
    digest = hashlib.md5(str(value).encode()).hexdigest()
    return int(digest[:8], 16)


def _rank(bits, width):
    """Position of the leftmost 1-bit in `bits` (a `width`-bit number), 1-indexed.
    A long run of leading zeros is a rare event -- rarer runs imply more distinct
    inputs were needed to produce one."""
    binary = format(bits, f"0{width}b")
    first_one = binary.find("1")
    return (width if first_one == -1 else first_one) + 1


class HyperLogLog:
    def __init__(self, precision=10):
        self.p = precision                # bits used to pick a bucket
        self.m = 1 << precision           # number of buckets (registers)
        self.registers = [0] * self.m
        # Bias-correction constant from the original HyperLogLog paper.
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, value):
        x = _hash(value)
        bucket = x >> (32 - self.p)                     # top p bits -> which bucket
        remainder = x & ((1 << (32 - self.p)) - 1)       # rest of the bits
        rank = _rank(remainder, 32 - self.p)
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        harmonic_mean = sum(2 ** -r for r in self.registers)
        return round(self.alpha * self.m ** 2 / harmonic_mean)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers, ~1 KB of memory total

    stream = [random.randint(1, 200_000) for _ in range(1_000_000)]
    for item in stream:
        hll.add(item)

    print("Estimated distinct:", hll.count())
    print("Actual distinct:   ", len(set(stream)))
