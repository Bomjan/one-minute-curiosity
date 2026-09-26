import hashlib
import math


class HyperLogLog:
    """Estimates the number of DISTINCT items in a huge stream using tiny memory."""

    def __init__(self, precision=10):
        self.p = precision                 # number of bits used to pick a register
        self.m = 1 << precision            # number of registers (e.g. 1024)
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant

    def _hash(self, value):
        digest = hashlib.sha256(str(value).encode()).hexdigest()
        return int(digest, 16)

    def _leading_zeros(self, w, max_bits):
        if w == 0:
            return max_bits
        count = 0
        bit = max_bits - 1
        while bit >= 0 and not (w >> bit) & 1:
            count += 1
            bit -= 1
        return count

    def add(self, value):
        x = self._hash(value)
        bucket = x & (self.m - 1)          # first p bits -> which register
        w = x >> self.p                    # remaining bits -> measure rarity
        rank = self._leading_zeros(w, 256 - self.p) + 1  # position of first 1-bit
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        z = sum(2.0 ** -r for r in self.registers)
        estimate = self.alpha * (self.m ** 2) / z

        # Small-cardinality correction: raw HLL is biased when most
        # registers are still empty, so fall back to linear counting.
        zeros = self.registers.count(0)
        if estimate <= 2.5 * self.m and zeros > 0:
            estimate = self.m * math.log(self.m / zeros)

        return int(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers, ~4KB
    true_unique = 100_000

    for i in range(true_unique):
        hll.add(f"user-{i}")

    estimate = hll.count()
    error = abs(estimate - true_unique) / true_unique * 100

    print(f"True unique count:      {true_unique:,}")
    print(f"HyperLogLog estimate:   {estimate:,}")
    print(f"Error:                  {error:.2f}%")
    print(f"Memory used:            {hll.m} registers (~{hll.m} bytes)")
