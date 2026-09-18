"""HyperLogLog: estimate the number of distinct items in a stream
using a fixed, tiny amount of memory — no matter how large the stream is.
"""

import hashlib
import math


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                      # bits used to pick a register
        self.m = 1 << b                 # number of registers (e.g. 1024)
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    @staticmethod
    def _alpha(m):
        # Bias-correction constant, standard values for small m,
        # asymptotic formula otherwise.
        if m == 16:
            return 0.673
        if m == 32:
            return 0.697
        if m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / m)

    @staticmethod
    def _hash(item):
        digest = hashlib.md5(str(item).encode()).hexdigest()
        return int(digest, 16)

    def add(self, item):
        x = self._hash(item)
        bucket = x & (self.m - 1)          # low bits choose the register
        remaining = x >> self.b            # remaining bits decide the rank
        rank = self._leading_zeros(remaining, width=128 - self.b) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    @staticmethod
    def _leading_zeros(x, width):
        if x == 0:
            return width
        return width - x.bit_length()

    def count(self):
        raw_estimate = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)

        # Small-range correction: fall back to linear counting when
        # most registers are still empty.
        zero_registers = self.registers.count(0)
        if raw_estimate <= 2.5 * self.m and zero_registers > 0:
            return round(self.m * math.log(self.m / zero_registers))

        return round(raw_estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)               # 1024 registers ≈ 1 KB of memory
    true_unique = set()

    for i in range(1_000_000):
        user_id = f"user-{i % 250_000}"   # 250,000 unique IDs, repeated 4x
        hll.add(user_id)
        true_unique.add(user_id)

    print("HyperLogLog estimate:", hll.count())
    print("Actual unique count :", len(true_unique))
