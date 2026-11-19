def count_ones(n):
    """Count the digit '1' in all integers from 0 through n."""
    if n < 0:
        raise ValueError("n must be nonnegative")

    total = 0
    place = 1
    while place <= n:
        higher = n // (place * 10)
        current = (n // place) % 10
        lower = n % place

        # Complete cycles contribute one '1' per position per ten numbers.
        total += higher * place
        if current == 1:
            total += lower + 1
        elif current > 1:
            total += place

        place *= 10
    return total


if __name__ == "__main__":
    for n in (13, 99, 100, 999, 1000, 1_000_000):
        print(f"0..{n}: {count_ones(n)} ones")

    # Compare against direct counting for small inputs.
    for n in range(1001):
        expected = sum(str(i).count("1") for i in range(n + 1))
        assert count_ones(n) == expected
    print("Verified against brute force for n = 0..1000")
