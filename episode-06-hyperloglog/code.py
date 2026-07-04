import hashlib


class HyperLogLog:
    def __init__(self, num_bucket_bits=10):
        self.b = num_bucket_bits          # bits used to pick a register
        self.m = 1 << num_bucket_bits     # number of registers (e.g. 1024)
        self.registers = [0] * self.m

    def _hash(self, item):
        digest = hashlib.sha1(str(item).encode()).hexdigest()
        return int(digest, 16) & 0xFFFFFFFF  # keep 32 bits

    def _leading_zeros(self, w, width):
        if w == 0:
            return width
        count = 0
        mask = 1 << (width - 1)
        while mask and not (w & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, item):
        x = self._hash(item)
        bucket = x & (self.m - 1)          # first b bits -> which register
        rest = x >> self.b                 # remaining bits -> the "coin flips"
        width = 32 - self.b
        rank = self._leading_zeros(rest, width) + 1
        self.registers[bucket] = max(self.registers[bucket], rank)

    def count(self):
        # Harmonic mean of the registers, corrected by a bias constant (alpha)
        alpha = 0.7213 / (1 + 1.079 / self.m)
        z = sum(2.0 ** -r for r in self.registers)
        return round(alpha * self.m * self.m / z)


if __name__ == "__main__":
    hll = HyperLogLog(num_bucket_bits=10)  # 1024 registers, ~1KB total

    unique_items = [f"user_{i}" for i in range(100_000)]
    for item in unique_items:
        hll.add(item)

    actual = len(unique_items)
    estimate = hll.count()
    error = abs(estimate - actual) / actual * 100

    print(f"Actual unique count:   {actual}")
    print(f"HyperLogLog estimate:  {estimate}")
    print(f"Error:                 {error:.2f}%")
    print(f"Memory used:           {hll.m} registers (~1KB)")
