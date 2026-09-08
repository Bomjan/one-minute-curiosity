"""HyperLogLog: count distinct items in a stream using a fixed, tiny amount of memory."""

import hashlib


class HyperLogLog:
    def __init__(self, b=10):
        self.b = b
        self.m = 1 << b  # number of buckets, e.g. 1024 when b = 10
        self.registers = [0] * self.m
        self.alpha = 0.673 if self.m == 16 else 0.7213 / (1 + 1.079 / self.m)

    def _hash_bits(self, item):
        digest = hashlib.sha1(str(item).encode()).hexdigest()
        return bin(int(digest, 16))[2:].zfill(160)

    def add(self, item):
        bits = self._hash_bits(item)
        bucket = int(bits[: self.b], 2)
        rest = bits[self.b :]
        # rho = position of the first 1-bit (how long the leading-zero streak was)
        rho = len(rest) - len(rest.lstrip("0")) + 1
        self.registers[bucket] = max(self.registers[bucket], rho)

    def count(self):
        indicator = sum(2.0**-r for r in self.registers)
        estimate = self.alpha * (self.m**2) / indicator
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog(b=10)
    true_unique = set()

    for i in range(100_000):
        user_id = f"user-{i % 40_000}"  # 40,000 real uniques, lots of repeats
        hll.add(user_id)
        true_unique.add(user_id)

    print("Actual unique:", len(true_unique))
    print("HLL estimate :", hll.count())
