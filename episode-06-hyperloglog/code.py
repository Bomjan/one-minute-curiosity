import hashlib
import math


def _hash32(item):
    """Turn any item into a well-mixed 32-bit integer."""
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)


def _leading_zero_run(w, width):
    """Position of the leftmost 1-bit in a `width`-bit number (1-indexed)."""
    for i in range(width):
        if w & (1 << (width - 1 - i)):
            return i + 1
    return width + 1  # all zeros (rare, but possible)


class HyperLogLog:
    def __init__(self, b=8):
        self.b = b                                   # bits used to pick a bucket
        self.m = 1 << b                               # number of buckets (registers)
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)    # bias-correction constant

    def add(self, item):
        x = _hash32(item)
        bucket = x >> (32 - self.b)                   # top b bits choose the bucket
        remainder = x & ((1 << (32 - self.b)) - 1)     # the rest is our "coin flips"
        run = _leading_zero_run(remainder, 32 - self.b)
        self.registers[bucket] = max(self.registers[bucket], run)

    def count(self):
        raw = self.alpha * self.m ** 2 / sum(2 ** -r for r in self.registers)

        zero_buckets = self.registers.count(0)
        if raw <= 2.5 * self.m and zero_buckets > 0:
            # Small cardinalities: linear counting is more accurate.
            return round(self.m * math.log(self.m / zero_buckets))
        return round(raw)


if __name__ == "__main__":
    true_unique = 100_000
    hll = HyperLogLog(b=8)  # 256 registers = 256 bytes of state

    for i in range(true_unique):
        hll.add(f"user-{i}")

    estimate = hll.count()
    error = abs(estimate - true_unique) / true_unique * 100

    print(f"True unique items: {true_unique}")
    print(f"HyperLogLog estimate: {estimate}")
    print(f"Error: {error:.2f}%")
    print(f"Memory used: {hll.m} registers (~{hll.m} bytes)")
