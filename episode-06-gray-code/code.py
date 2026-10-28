def gray_code(n):
    """Return all n-bit Gray codes: each neighbour differs by exactly one bit."""
    return [i ^ (i >> 1) for i in range(1 << n)]


def from_gray(g):
    """Decode a Gray code back to a plain binary number."""
    n = 0
    while g:
        n ^= g
        g >>= 1
    return n


if __name__ == "__main__":
    codes = gray_code(3)
    print([format(c, "03b") for c in codes])
    # ['000', '001', '011', '010', '110', '111', '101', '100']
    assert all(bin(a ^ b).count("1") == 1 for a, b in zip(codes, codes[1:] + codes[:1]))
    assert [from_gray(c) for c in codes] == list(range(8))
