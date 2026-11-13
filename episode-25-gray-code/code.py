"""Generate an n-bit Gray code: neighbors differ by exactly one bit."""


def gray_code(bits):
    if bits < 0:
        raise ValueError("bits must be nonnegative")
    return [i ^ (i >> 1) for i in range(1 << bits)]


if __name__ == "__main__":
    bits = 4
    sequence = gray_code(bits)
    for value in sequence:
        print(f"{value:0{bits}b}")

    assert len(set(sequence)) == 1 << bits
    assert all((a ^ b).bit_count() == 1 for a, b in zip(sequence, sequence[1:]))
    assert (sequence[-1] ^ sequence[0]).bit_count() == 1
    print("Verified: unique values, one-bit transitions, including wraparound.")
