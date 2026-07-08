import hashlib
import math

HASH_BITS = 32


def _hash(item):
    """Deterministic 32-bit hash of an item."""
    digest = hashlib.md5(str(item).encode()).hexdigest()
    return int(digest[:8], 16)


def _leading_zeros(x, bits):
    """Count leading zero bits in a `bits`-wide integer."""
    if x == 0:
        return bits
    count = 0
    for i in range(bits - 1, -1, -1):
        if (x >> i) & 1:
            break
        count += 1
    return count


def hyperloglog_estimate(items, b=4):
    """Estimate the number of distinct items using 2^b registers."""
    m = 2 ** b
    registers = [0] * m
    remainder_bits = HASH_BITS - b

    for item in items:
        h = _hash(item)
        bucket = h & (m - 1)                      # last b bits choose the register
        remainder = h >> b                        # remaining bits get scanned
        run_length = _leading_zeros(remainder, remainder_bits) + 1
        registers[bucket] = max(registers[bucket], run_length)

    alpha = 0.7213 / (1 + 1.079 / m)  # standard bias-correction constant
    raw_estimate = alpha * m * m / sum(2 ** -r for r in registers)

    # Small-cardinality correction: when few registers are touched, the raw
    # estimator is biased, so fall back to linear counting (Flajolet et al.)
    empty_registers = registers.count(0)
    if raw_estimate <= 2.5 * m and empty_registers > 0:
        raw_estimate = m * math.log(m / empty_registers)

    return round(raw_estimate)


if __name__ == "__main__":
    # Test 1: A tiny stream with obvious duplicates
    small_stream = ["alice", "bob", "alice", "carol", "bob", "dave", "alice"]
    print(f"Small stream (exact=4): estimate = {hyperloglog_estimate(small_stream)}")

    # Test 2: A million unique users, estimated with more registers for accuracy
    big_stream = [f"user-{i}" for i in range(1_000_000)]
    print(f"Big stream (exact=1,000,000): estimate = {hyperloglog_estimate(big_stream, b=10)}")
