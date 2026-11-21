# Episode 33 — The Numbers That Make Euclid Work Hardest

**Hook:** The ancient Euclidean GCD algorithm takes unusually many divisions on consecutive Fibonacci numbers—the very sequence famous for growing quickly.

## The logic

Euclid repeatedly replaces `(a, b)` with `(b, a % b)` until `b` becomes zero. The remaining `a` is the greatest common divisor (GCD).

For example, with `55` and `34`:

```text
55 % 34 = 21
34 % 21 = 13
21 % 13 = 8
13 % 8  = 5
8  % 5  = 3
5  % 3  = 2
3  % 2  = 1
2  % 1  = 0
```

That's **eight remainder operations** just to obtain `gcd(55, 34) = 1`.

Why Fibonacci? Consecutive Fibonacci numbers obey `F(n) = F(n-1) + F(n-2)`, so each remainder produces the previous Fibonacci number. Euclid therefore walks backward through the sequence, nearly one term at a time. For `n >= 4`, inputs `F(n)` and `F(n-1)` take exactly `n - 2` remainder operations.

This illustrates **Lamé's theorem**: for a given number of Euclidean divisions, consecutive Fibonacci numbers give the smallest possible *smaller input* (apart from the trivial initial cases). They are the classic worst-case family for Euclid's algorithm.

## Try it

From this episode folder:

```bash
python3 code.py
```

Expected output:

```text
gcd(55, 34) = 1, divisions = 8
gcd(6765, 4181) = 1, divisions = 18
gcd(832040, 514229) = 1, divisions = 28
```

## The result

Even these difficult cases need only **O(log min(a, b))** divisions for positive inputs, because Fibonacci numbers grow exponentially with their index. The example counts division operations, not the bit-level cost of arithmetic on very large integers. Euclid remains remarkably efficient even on its slowest input family.
