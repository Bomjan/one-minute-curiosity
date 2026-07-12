"""
HyperLogLog: estimate how many UNIQUE items you've seen using a fixed,
tiny amount of memory -- no matter how many items pass through.
"""

import math
import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b  # number of registers (buckets)
        self.registers = [0] * self.m

        # Bias-correction constant; standard values for small m, formula for larger m.
        if self.m == 16:
            self.alpha = 0.673
        elif self.m == 32:
            self.alpha = 0.697
        elif self.m == 64:
            self.alpha = 0.709
        else:
            self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")  # 64-bit hash

    def _rank(self, w, width):
        # Position of the leftmost 1-bit within `width` bits (1-indexed).
        # A "rarer" pattern (more leading zeros) means a bigger, rarer sample.
        if w == 0:
            return width + 1
        return width - w.bit_length() + 1

    def add(self, item):
        x = self._hash(item)
        bucket = x >> (64 - self.b)                # top b bits pick a register
        w = x & ((1 << (64 - self.b)) - 1)          # remaining bits measure "rarity"
        rank = self._rank(w, 64 - self.b)
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        z = sum(2.0 ** -r for r in self.registers)
        estimate = self.alpha * self.m * self.m / z

        # For small cardinalities, fall back to linear counting -- it's more accurate.
        zeros = self.registers.count(0)
        if estimate <= 2.5 * self.m and zeros > 0:
            estimate = self.m * math.log(self.m / zeros)

        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 registers, ~3% typical error

    unique_visitors = [f"user_{i}" for i in range(100_000)]
    for visitor in unique_visitors:
        hll.add(visitor)

    print("Real count:  ", len(unique_visitors))
    print("HLL estimate:", hll.count())
    print("Memory used: ", hll.m, "small integers -- not 100,000 strings")
