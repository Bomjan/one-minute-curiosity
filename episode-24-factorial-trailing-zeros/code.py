from math import factorial

def trailing_zeros(n):
    """Count factors of 5 in n!, without computing n!."""
    if n < 0:
        raise ValueError("n must be nonnegative")
    total = 0
    while n:
        n //= 5
        total += n
    return total

if __name__ == "__main__":
    for n in (10, 25, 100, 1000):
        print(f"{n}! has {trailing_zeros(n)} trailing zeros")
    for n in range(501):
        value = str(factorial(n))
        actual = len(value) - len(value.rstrip("0"))
        assert trailing_zeros(n) == actual, n
    print("Verified n = 0 through 500 against actual factorials")
