"""Zeckendorf's theorem: every positive integer has a unique nonadjacent Fibonacci sum."""


def representation(n):
    if n < 1:
        raise ValueError("n must be positive")

    fib = [1, 2]  # Distinct Fibonacci values: F2, F3, ...
    while fib[-1] <= n:
        fib.append(fib[-1] + fib[-2])

    chosen = []
    remaining = n
    for value in reversed(fib):
        if value <= remaining:
            chosen.append(value)
            remaining -= value
    return chosen


if __name__ == "__main__":
    for n in (10, 42, 100):
        terms = representation(n)
        print(f"{n} = {' + '.join(map(str, terms))}")

    # Independent exhaustive check of uniqueness for numbers up to 1000.
    fib = [1, 2]
    while fib[-1] <= 1000:
        fib.append(fib[-1] + fib[-2])
    counts = [0] * 1001
    for mask in range(1 << len(fib)):
        if mask & (mask << 1):  # Adjacent Fibonacci positions are forbidden.
            continue
        total = sum(value for i, value in enumerate(fib) if mask & (1 << i))
        if 1 <= total <= 1000:
            counts[total] += 1
    assert all(count == 1 for count in counts[1:])
    for n in range(1, 1001):
        assert sum(representation(n)) == n
    print("Verified: each integer from 1 to 1000 has exactly one valid sum.")
