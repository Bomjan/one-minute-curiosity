import hashlib


class HyperLogLog:
    def __init__(self, bucket_bits=8):
        self.bucket_bits = bucket_bits
        self.num_buckets = 1 << bucket_bits  # 256 buckets by default
        self.buckets = [0] * self.num_buckets
        self.alpha = 0.7213 / (1 + 1.079 / self.num_buckets)

    def _hash32(self, value):
        digest = hashlib.sha1(str(value).encode()).digest()
        return int.from_bytes(digest[:4], "big")

    def _leading_zeros(self, x, bit_width):
        if x == 0:
            return bit_width
        count = 0
        mask = 1 << (bit_width - 1)
        while mask and not (x & mask):
            count += 1
            mask >>= 1
        return count

    def add(self, value):
        h = self._hash32(value)
        bucket_index = h & (self.num_buckets - 1)          # low bits pick the bucket
        remaining_bits = 32 - self.bucket_bits
        remaining = h >> self.bucket_bits
        rank = self._leading_zeros(remaining, remaining_bits) + 1
        if rank > self.buckets[bucket_index]:
            self.buckets[bucket_index] = rank              # keep only the longest streak

    def count(self):
        harmonic_sum = sum(2.0 ** -r for r in self.buckets)
        estimate = self.alpha * (self.num_buckets ** 2) / harmonic_sum
        return round(estimate)


if __name__ == "__main__":
    hll = HyperLogLog()
    unique_visitors = 10_000

    for i in range(unique_visitors):
        hll.add(f"user_{i}")

    # Feed in 5,000 repeats — they must not move the estimate
    for i in range(5_000):
        hll.add(f"user_{i}")

    estimate = hll.count()
    error = abs(estimate - unique_visitors) / unique_visitors * 100

    print(f"Actual unique visitors: {unique_visitors}")
    print(f"Estimated count:        {estimate}")
    print(f"Error:                  {error:.2f}%")
    print(f"Memory used:            {len(hll.buckets)} bytes")
