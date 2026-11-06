# Episode 18 — Every Number Has a Secret Fibonacci Signature

**The hook:** Every positive whole number can be written in exactly one way as a sum of distinct, nonconsecutive Fibonacci numbers.

## The logic

This is **Zeckendorf's theorem**. Start with the Fibonacci values `1, 2, 3, 5, 8, 13, 21, 34, ...` (we use one copy of `1`). Repeatedly choose the largest value no greater than the amount left.

For example, `100 = 89 + 8 + 3`. The chosen Fibonacci values never sit next to one another in the sequence. If we allowed neighboring terms, we would lose uniqueness: `5 = 5` but also `5 = 3 + 2`.

Why does the greedy rule avoid neighbors? After taking a Fibonacci number `F_k`, the remainder is smaller than `F_{k-1}`: the next larger Fibonacci number is `F_{k+1} = F_k + F_{k-1}`, and our remainder is less than `F_{k+1} - F_k`. So `F_{k-1}` cannot be chosen. The theorem also guarantees that no other nonconsecutive selection produces the same number.

## The result

The program prints decompositions for 10, 42 and 100. It then independently enumerates all subsets of the Fibonacci values up to 1000, rejects adjacent positions, and checks that **each integer from 1 through 1000 has exactly one representation**. This finite test illustrates the theorem; it is not a proof for every integer.

```text
10 = 8 + 2
42 = 34 + 8
100 = 89 + 8 + 3
Verified: each integer from 1 to 1000 has exactly one valid sum.
```

## Run it

From this episode's folder:

```bash
python3 code.py
```

The greedy decomposition uses O(log n) Fibonacci values and O(log n) time and space for positive integer `n` (with arithmetic costs abstracted away). The exhaustive checker is intentionally much slower and limited to 1000.

**Takeaway:** Fibonacci numbers are more than a famous sequence: they form a unique, constrained number system.
