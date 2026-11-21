"""Euclid's slowest inputs are consecutive Fibonacci numbers."""

def gcd_steps(a, b):
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps

fib = [0, 1]
for _ in range(2, 31):
    fib.append(fib[-1] + fib[-2])

for n in (10, 20, 30):
    a, b = fib[n], fib[n - 1]
    gcd, steps = gcd_steps(a, b)
    print(f"gcd({a}, {b}) = {gcd}, divisions = {steps}")
    assert gcd == 1 and steps == n - 2
