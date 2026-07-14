"""HyperLogLog: count billions of unique items using kilobytes of memory."""

import hashlib
import math


class HyperLogLog:
    """Estimates the number of distinct items using O(m) memory,
    no matter how many items are added."""

    def __init__(self, precision=10):
        self.p = precision            # bits used to pick a register
        self.m = 1 << precision       # number of registers
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    @staticmethod
    def _alpha(m):
        # standard HyperLogLog bias-correction constant
        if m == 16:
            return 0.673
        if m == 32:
            return 0.697
        if m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).digest()
        return int.from_bytes(digest[:8], "big")  # 64-bit hash

    def _leading_zero_count(self, value, bits):
        if value == 0:
            return bits
        count = 0
        mask = 1 << (bits - 1)
        while mask and not (value & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        h = self._hash(item)
        bucket = h & (self.m - 1)                    # low p bits select the register
        remaining = h >> self.p                       # remaining (64 - p) bits
        rank = self._leading_zero_count(remaining, 64 - self.p) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        raw = self.alpha * self.m * self.m / sum(2 ** -r for r in self.registers)

        # small-range correction: fall back to linear counting when
        # many registers are still untouched
        zeros = self.registers.count(0)
        if raw <= 2.5 * self.m and zeros > 0:
            return round(self.m * math.log(self.m / zeros))

        return round(raw)


if __name__ == "__main__":
    hll = HyperLogLog(precision=10)
    true_items = set()

    for i in range(100_000):
        value = f"user-{i % 40_000}"  # only 40,000 truly unique values
        hll.add(value)
        true_items.add(value)

    print(f"Actual unique items:   {len(true_items)}")
    print(f"HyperLogLog estimate:  {hll.count()}")
    print(f"Memory used:           {hll.m} registers (~{hll.m} bytes)")
