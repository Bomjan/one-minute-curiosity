# Episode 29 — Multiply Without Multiplication

**You can multiply any two integers using only doubling, halving, addition, and an odd/even check.**

## The hook

How did people multiply large numbers without a multiplication table? A technique often called **Russian peasant multiplication** turns multiplication into repeated doubling and halving.

## The logic

To compute **13 × 12**, repeatedly double the left column and halve the right column (discard remainders):

| Doubled value | Halved multiplier | Keep? |
| ---: | ---: | :--- |
| 13 | 12 | No — even |
| 26 | 6 | No — even |
| 52 | 3 | Yes — odd |
| 104 | 1 | Yes — odd |

Add only the kept values: **52 + 104 = 156**.

Why does this work? Each step writes the multiplier as `b = 2q + r`, where `r` is 0 or 1. Thus `a × b = (2a) × q + a × r`. We add `a` when `r = 1`, then continue with `2a` and `q`. This is multiplication through the binary digits of the multiplier.

The code handles negative inputs separately: calculate using absolute values, then restore the sign.

## Try it

Requires Python 3. From this directory:

```bash
python3 code.py
```

Expected output:

```text
13 x 12 = 156
-13 x 12 = -156
13 x -12 = -156
0 x 99 = 0
40,401 multiplication checks passed
```

The assertions compare every pair from -100 through 100 against Python's built-in multiplication.

## The result

The loop takes **O(log(|b| + 1)) iterations** and O(1) auxiliary variables, assuming fixed-width arithmetic. With Python's arbitrary-precision integers, bit-operation costs also grow with operand size. It is **not generally faster than built-in `*`** on modern computers; its value is revealing how multiplication can be built from simpler operations.
