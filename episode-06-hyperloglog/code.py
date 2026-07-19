"""HyperLogLog: estimate the number of unique items in a massive stream
using only a few kilobytes of memory."""

import hashlib


class HyperLogLog:
    def __init__(self, precision=12):
        # precision controls memory (2^precision registers) vs accuracy
        self.precision = precision
        self.num_registers = 1 << precision
        self.registers = [0] * self.num_registers
        # bias-correction constant, standard for HLL with many registers
        self.alpha = 0.7213 / (1 + 1.079 / self.num_registers)

    def _hash(self, item):
        # 64 bits is plenty to split into a bucket index + a rank estimator
        digest = hashlib.sha1(item.encode()).digest()
        return int.from_bytes(digest[:8], byteorder="big")

    def add(self, item):
        h = self._hash(item)
        bucket = h >> (64 - self.precision)
        remaining_bits = 64 - self.precision
        remaining = h & ((1 << remaining_bits) - 1)
        # rank = 1 + position of the leftmost 1 bit ("how rare was this hash")
        rank = remaining_bits - remaining.bit_length() + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        # harmonic mean of 2^register smooths out lucky/unlucky buckets
        raw_estimate = self.alpha * self.num_registers ** 2 / sum(
            2 ** -r for r in self.registers
        )
        return round(raw_estimate)


if __name__ == "__main__":
    hll = HyperLogLog(precision=12)  # 4096 registers, ~4 KB total

    unique_users = {f"user_{i}" for i in range(1_000_000)}
    for user in unique_users:
        hll.add(user)

    actual = len(unique_users)
    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique users:   {actual:,}")
    print(f"HyperLogLog estimate:  {estimate:,}")
    print(f"Error:                 {error:.2f}%")
