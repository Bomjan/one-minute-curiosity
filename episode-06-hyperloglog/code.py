"""HyperLogLog: estimate how many unique items passed through a stream,
using a fixed, tiny amount of memory — no matter how big the stream gets."""

import hashlib


def _hash(value: str) -> int:
    """Turn any string into a well-mixed 32-bit integer."""
    digest = hashlib.md5(value.encode()).digest()
    return int.from_bytes(digest[:4], "big")


def _rho(bits: int, max_bits: int) -> int:
    """Position of the leftmost 1-bit (1-indexed). All zeros -> max_bits + 1."""
    for i in range(max_bits - 1, -1, -1):
        if bits & (1 << i):
            return max_bits - i
    return max_bits + 1


class HyperLogLog:
    def __init__(self, precision: int = 10):
        self.p = precision
        self.m = 1 << precision  # number of registers, e.g. 1024
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant

    def add(self, item: str) -> None:
        h = _hash(item)
        index = h >> (32 - self.p)  # first p bits pick a "bucket"
        remaining = h & ((1 << (32 - self.p)) - 1)
        run = _rho(remaining, 32 - self.p)  # longest run of leading zeros seen
        self.registers[index] = max(self.registers[index], run)

    def count(self) -> int:
        harmonic_mean = sum(2**-reg for reg in self.registers)
        estimate = self.alpha * self.m * self.m / harmonic_mean
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)  # 1024 registers ≈ 1 KB of memory

    unique_visitors = 100_000
    for i in range(unique_visitors):
        hll.add(f"user-{i}")

    print(f"Estimated unique visitors: {hll.count()}")
    print(f"Actual unique visitors:    {unique_visitors}")
