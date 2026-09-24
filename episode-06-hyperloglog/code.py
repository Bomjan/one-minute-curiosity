import hashlib
import math


def _hash32(item):
    # A cryptographic hash gives us near-perfect bit independence,
    # which HyperLogLog depends on to stay unbiased.
    digest = hashlib.sha1(str(item).encode()).digest()
    return int.from_bytes(digest[:4], "big")


def _rho(w, max_bits):
    # Position of the leftmost 1-bit in w (1-indexed).
    # A "rarer" pattern (more leading zeros) means a bigger rank.
    if w == 0:
        return max_bits + 1
    rank = 1
    mask = 1 << (max_bits - 1)
    while not (w & mask):
        rank += 1
        mask >>= 1
    return rank


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b                        # bits used to pick a bucket
        self.m = 1 << b                   # number of buckets (registers)
        self.registers = [0] * self.m
        self.remaining_bits = 32 - b

    def add(self, item):
        h = _hash32(item)
        index = h >> self.remaining_bits                    # top b bits -> bucket
        w = h & ((1 << self.remaining_bits) - 1)             # rest -> rank source
        rank = _rho(w, self.remaining_bits)
        self.registers[index] = max(self.registers[index], rank)

    def _alpha(self):
        if self.m == 16:
            return 0.673
        if self.m == 32:
            return 0.697
        if self.m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / self.m)

    def count(self):
        alpha = self._alpha()
        raw = alpha * self.m * self.m / sum(2.0 ** -r for r in self.registers)

        # Small-cardinality correction: if most buckets are still empty,
        # linear counting is more accurate than the harmonic-mean estimate.
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))
        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 registers, ~1KB of state

    true_set = set()
    for i in range(50_000):
        value = f"user-{i % 20_000}"  # 20,000 distinct visitors, repeated
        hll.add(value)
        true_set.add(value)

    estimate = hll.count()
    actual = len(true_set)
    error = abs(estimate - actual) / actual * 100

    print(f"Actual distinct count: {actual}")
    print(f"HyperLogLog estimate:  {estimate}")
    print(f"Error: {error:.2f}%")
    print(f"Memory used: {hll.m} registers (a handful of bytes each)")
