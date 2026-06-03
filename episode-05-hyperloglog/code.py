import hashlib
import math


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b           # register index bits
        self.m = 1 << b      # number of registers = 2^b
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    def _alpha(self, m):
        if m == 16: return 0.673
        if m == 32: return 0.697
        if m == 64: return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item):
        return int(hashlib.sha256(str(item).encode()).hexdigest(), 16)

    def _leading_zeros(self, value, max_bits):
        if value == 0:
            return max_bits
        return max_bits - value.bit_length()

    def add(self, item):
        h = self._hash(item)
        register_index = h >> (256 - self.b)
        remainder = h & ((1 << (256 - self.b)) - 1)
        run_length = self._leading_zeros(remainder, 256 - self.b) + 1
        self.registers[register_index] = max(self.registers[register_index], run_length)

    def count(self):
        z = sum(2 ** -r for r in self.registers)
        return int(self.alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)  # 1024 registers ≈ 1 KB

    actual = 100_000
    for i in range(actual):
        hll.add(f"user_{i}")

    # Duplicates must not inflate the count
    for i in range(50_000):
        hll.add(f"user_{i}")

    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique items : {actual:,}")
    print(f"HyperLogLog estimate: {estimate:,}")
    print(f"Error               : {error:.2f}%")
    print(f"Memory (registers)  : {hll.m} bytes")
