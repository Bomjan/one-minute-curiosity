import hashlib
import math
import random


class HyperLogLog:
    def __init__(self, error_rate: float = 0.02):
        # Number of registers derived from desired error rate: 1.04/sqrt(m)
        self.b = max(4, math.ceil(math.log2((1.04 / error_rate) ** 2)))
        self.m = 1 << self.b
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    def _alpha(self, m: int) -> float:
        if m == 16:   return 0.673
        if m == 32:   return 0.697
        if m == 64:   return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item: str) -> int:
        return int(hashlib.sha256(item.encode()).hexdigest(), 16)

    def _leading_zeros(self, bits: int, max_bits: int) -> int:
        if bits == 0:
            return max_bits + 1
        count = 1
        while (bits & (1 << (max_bits - 1))) == 0:
            bits <<= 1
            count += 1
        return count

    def add(self, item: str):
        h = self._hash(item)
        register_idx = h >> (256 - self.b)
        remaining = (h << self.b) & ((1 << 256) - 1)
        leading = self._leading_zeros(remaining, 256 - self.b)
        self.registers[register_idx] = max(self.registers[register_idx], leading)

    def count(self) -> int:
        raw = self.alpha * self.m ** 2 * sum(2 ** -r for r in self.registers) ** -1

        # Small range correction
        if raw <= 2.5 * self.m:
            zeros = self.registers.count(0)
            if zeros > 0:
                return round(self.m * math.log(self.m / zeros))

        return round(raw)

    def __repr__(self):
        memory_bytes = self.m
        return (
            f"HyperLogLog(registers={self.m}, "
            f"error≈{1.04 / math.sqrt(self.m):.1%}, "
            f"memory={memory_bytes} bytes)"
        )


if __name__ == "__main__":
    hll = HyperLogLog(error_rate=0.02)
    print(hll)

    n_distinct = 100_000
    user_ids = [f"user_{i}" for i in range(n_distinct)]

    for uid in user_ids:
        hll.add(uid)

    # Add duplicates — should not affect the estimate
    for uid in random.sample(user_ids, 10_000):
        hll.add(uid)

    estimate = hll.count()
    error = abs(estimate - n_distinct) / n_distinct
    print(f"True distinct: {n_distinct:,}")
    print(f"HLL estimate:  {estimate:,}")
    print(f"Error:         {error:.2%}")
