# Balanced Ternary: A Number System That Needs No Minus Sign

**What if a number system could represent positive and negative integers with the same three digits—without a separate sign?**

## The idea

Ordinary base 3 uses digits `0, 1, 2`. **Balanced ternary** instead uses `T, 0, 1`, where `T = -1`. Each position still has a power-of-three place value.

For example:

```text
  1T1 (balanced ternary)
= 1 × 9 + (-1) × 3 + 1 × 1
= 7

  T1
= (-1) × 3 + 1
= -2
```

The same place values work for both signs. Negating a number is as simple as swapping every `1` with `T` (and leaving zeros alone).

## The trick: carry when the remainder is 2

Divide by 3 repeatedly. A remainder of 0 or 1 becomes that digit. A remainder of 2 is represented as `T` (minus one) **plus a carry of 1**, because `2 = -1 + 3`.

For `8`:

1. `8 = 3 × 2 + 2`: write `T`, carry one, leaving 3.
2. `3 = 3 × 1 + 0`: write `0`, leaving 1.
3. `1 = 3 × 0 + 1`: write `1`.

Read digits backwards: **`8 = 10T`**, since `9 - 1 = 8`.

Java's `Math.floorDiv` and `Math.floorMod` keep the remainder nonnegative even for negative input. The implementation handles all Java `long` values, including `Long.MIN_VALUE`, without overflow.

## Try it

From this folder, with a JDK installed:

```bash
javac code.java
java code
```

The program prints examples, round-trips each through an independent `BigInteger` positional decoder, and checks all integers from -10,000 through 10,000 plus both `long` extremes. It throws an error if any reconstruction fails.

## What did we learn?

Every integer has a unique finite balanced-ternary representation (without leading zeros). The representation uses **O(log |n|)** digits and the conversion uses **O(log |n|)** arithmetic steps for nonzero `n`. Balanced ternary has appeared in ternary computing and is closely related to weighing puzzles with weights placed on either side of a balance scale.

**Important:** `T` is just a readable symbol for -1, not a standard Java numeric literal. The program demonstrates a numeral system, not a claim that balanced ternary outperforms binary on modern hardware.
