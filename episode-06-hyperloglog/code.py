"""
HyperLogLog — estimate the number of DISTINCT items in a huge stream
using a fixed, tiny amount of memory (a handful of registers).
"""

import math


def hash32(s):
    """Deterministic 32-bit hash (FNV-1a + a finalizer for a clean avalanche)."""
    h = 0x811C9DC5
    for byte in s.encode():
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h


def rho(w, width):
    """Position of the leftmost 1-bit in a `width`-bit number (1-indexed)."""
    if w == 0:
        return width + 1
    return width - w.bit_length() + 1


def hyperloglog_estimate(stream, b=4):
    """Estimate the number of distinct items in `stream` using 2**b registers."""
    m = 1 << b
    registers = [0] * m
    tail_width = 32 - b

    for item in stream:
        x = hash32(str(item))
        j = x & (m - 1)        # last b bits pick a register
        w = x >> b              # remaining bits measure a "run of zeros"
        registers[j] = max(registers[j], rho(w, tail_width))

    alpha = 0.673 if m == 16 else 0.7213 / (1 + 1.079 / m)
    raw_estimate = alpha * m * m / sum(2 ** -r for r in registers)

    # small-cardinality correction (linear counting)
    if raw_estimate <= 2.5 * m:
        zero_registers = registers.count(0)
        if zero_registers:
            return round(m * math.log(m / zero_registers))

    return round(raw_estimate)


if __name__ == "__main__":
    # 100,000 events, only 5,000 truly distinct visitor IDs
    stream = [f"visitor-{i % 5000}" for i in range(100_000)]

    exact = len(set(stream))
    estimate = hyperloglog_estimate(stream, b=10)  # 1024 registers = 4KB

    error = abs(estimate - exact) / exact * 100

    print(f"Exact distinct count : {exact}")
    print(f"HyperLogLog estimate : {estimate}")
    print(f"Error                : {error:.2f}%")
    print("Memory used           : a few KB, regardless of stream length")
