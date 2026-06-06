import hashlib
import math
import random
import string


class HyperLogLog:
    def __init__(self, b: int = 14):
        # b controls accuracy vs memory: m = 2^b registers
        # b=14 → 16384 registers, ~12 KB, ~0.81% error
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m

    def _hash(self, item: str) -> int:
        return int(hashlib.sha256(item.encode()).hexdigest(), 16)

    def _leading_zeros(self, bits: int, width: int) -> int:
        if bits == 0:
            return width
        return width - bits.bit_length() + 1

    def add(self, item: str):
        h = self._hash(item)
        register_idx = h >> (256 - self.b)
        remaining = h & ((1 << (256 - self.b)) - 1)
        run = self._leading_zeros(remaining, 256 - self.b)
        self.registers[register_idx] = max(self.registers[register_idx], run)

    def count(self) -> int:
        alpha = 0.7213 / (1 + 1.079 / self.m)
        raw = alpha * self.m ** 2 / sum(2 ** (-r) for r in self.registers)

        # Small range correction
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))

        return round(raw)

    def __repr__(self):
        mem_bytes = self.m * 5 / 8
        return (
            f"HyperLogLog(b={self.b}, registers={self.m}, "
            f"memory~{mem_bytes/1024:.1f} KB, "
            f"error~{100 * 1.04 / self.m**0.5:.2f}%)"
        )


def random_id():
    return ''.join(random.choices(string.ascii_lowercase, k=12))


if __name__ == "__main__":
    hll = HyperLogLog(b=14)
    print(hll)

    actual = set()
    for _ in range(1_000_000):
        uid = random_id()
        actual.add(uid)
        hll.add(uid)

    print(f"Exact count:      {len(actual):,}")
    print(f"HyperLogLog est:  {hll.count():,}")
    error = abs(hll.count() - len(actual)) / len(actual) * 100
    print(f"Error:            {error:.2f}%")
