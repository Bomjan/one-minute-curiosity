# Episode 21 — Fibonacci in Logarithmic Steps

**Hook:** You can calculate the thousandth Fibonacci number using only about ten recursive halving steps instead of generating the first thousand numbers one by one.

## The logic

The Fibonacci sequence starts with F(0) = 0 and F(1) = 1. The trick is to calculate **two consecutive values at once**: F(n) and F(n+1).

Suppose we already know `a = F(k)` and `b = F(k+1)`. Then:

- `F(2k) = a × (2b − a)`
- `F(2k+1) = a² + b²`
- `F(2k+2) = F(2k) + F(2k+1)`

So to calculate F(n), first solve the smaller problem at `k = floor(n/2)`, then choose the even or odd result. Every recursive step halves the index.

For example, F(10) uses the pair at index 5, which uses index 2, then 1, then 0. The answer is **55**.

## Try it

From this folder, with a JDK installed:

```bash
javac code.java
java code
```

The program independently checks F(0) through F(1000) against a simple iterative reference, prints F(100), and confirms F(1000) has 209 decimal digits. `BigInteger` avoids overflow.

## What did we learn?

Fast doubling uses **O(log n) recursive steps** and **O(log n) stack frames**, rather than O(n) iterations. It does **not** mean constant-cost arithmetic: the integers grow with n, so multiplication of large numbers costs more than a primitive operation. The program is a reproducible illustration of the algorithm, not a benchmark claiming a universal speedup.

This is different from Zeckendorf's theorem (Episode 18): that theorem represents integers *as sums* of nonconsecutive Fibonacci numbers; here we *compute* Fibonacci numbers efficiently.
