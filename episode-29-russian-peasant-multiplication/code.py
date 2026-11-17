"""Multiply integers using only addition, doubling, and halving."""


def multiply(a: int, b: int) -> int:
    negative = (a < 0) != (b < 0)
    a, b = abs(a), abs(b)
    result = 0

    while b:
        if b & 1:
            result += a  # Keep this doubled value when the multiplier is odd.
        a += a
        b //= 2

    return -result if negative else result


if __name__ == "__main__":
    for a, b in [(13, 12), (-13, 12), (13, -12), (0, 99)]:
        print(f"{a} x {b} = {multiply(a, b)}")

    for a in range(-100, 101):
        for b in range(-100, 101):
            assert multiply(a, b) == a * b
    print("40,401 multiplication checks passed")
