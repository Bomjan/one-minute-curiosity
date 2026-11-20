def modular_power(base, exponent, modulus):
    """Compute base**exponent % modulus without building the huge power."""
    if exponent < 0 or modulus <= 0:
        raise ValueError("exponent must be nonnegative and modulus positive")

    result = 1 % modulus
    base %= modulus
    while exponent:
        if exponent & 1:
            result = result * base % modulus
        base = base * base % modulus
        exponent >>= 1
    return result


if __name__ == "__main__":
    print("2^1,000,000,000 mod 1,000,000,007 =", modular_power(2, 1_000_000_000, 1_000_000_007))
    assert modular_power(2, 10, 1000) == 24
    assert modular_power(9, 0, 1) == 0
    for base in range(-10, 11):
        for exponent in range(21):
            for modulus in range(1, 26):
                assert modular_power(base, exponent, modulus) == pow(base, exponent, modulus)
    print("Verified 11,025 cases against Python's built-in pow().")
