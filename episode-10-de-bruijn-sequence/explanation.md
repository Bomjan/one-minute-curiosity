# Episode 10: A 4-Digit Lock, 10,000 PINs, and Only 10,003 Keypresses

**There are 10,000 possible four-digit PINs. A single carefully constructed string of just 10,003 digits contains every one of them as consecutive digits.**

## The Curiosity

Suppose a hypothetical keypad checks the *last four digits typed* after every keypress, without requiring Enter and without locking you out. Testing each PIN separately would mean typing 40,000 digits. Can we overlap the attempts?

Yes. A **de Bruijn sequence** of order `n` over an alphabet of `k` symbols is a cyclic sequence in which every possible length-`n` string occurs **exactly once** as a consecutive window.

For decimal four-digit PINs, `k = 10` and `n = 4`. There are `10^4 = 10,000` windows to cover.

## A Smaller Example

For three-bit strings, one de Bruijn cycle is:

```text
00010111
```

Treat it as a circle, then copy its first two bits to the end to show the wraparound:

```text
0001011100
```

Its eight overlapping three-bit windows are:

```text
000, 001, 010, 101, 011, 111, 110, 100
```

That is every possible three-bit string, exactly once.

## Why 10,003 Is the Minimum

A linear string of length `L` has only `L - 4 + 1 = L - 3` consecutive four-digit windows. To contain 10,000 different PINs, it must satisfy:

`L - 3 >= 10,000`, so `L >= 10,003`.

A decimal de Bruijn cycle has exactly 10,000 digits. Appending its first three digits makes the cyclic wraparound windows visible in a linear string, giving **10,003 digits**. It reaches the lower bound exactly.

This is a mathematical property of overlapping strings, **not** a practical lock-opening claim. Real locks often require Enter, enforce attempt limits, or reset their input between guesses.

## How the Code Works

The Java example constructs a de Bruijn cycle using the **FKM algorithm** (Fredricksen–Kessler–Maiorana). It recursively generates the repeating patterns needed to cover every possible fixed-width string without duplicating a window.

Then an independent checker scans every overlapping window and verifies that each possible number appears exactly once. The program checks all 2-, 3-, and 4-digit decimal strings.

## Run It

From the repository root:

```bash
cd episode-10-de-bruijn-sequence
javac code.java
java code
```

The public class is named `code`, matching `code.java`. Requires Java 8 or later; no dependencies.

Expected output:

```text
2-digit PINs: 100 combinations, 101 keypresses
3-digit PINs: 1000 combinations, 1002 keypresses
4-digit PINs: 10000 combinations, 10003 keypresses
First 60 digits: 000010002000300040005000600070008000900110012001300140015001
PASS: every PIN occurs exactly once as a sliding window.
```

## Complexity

For alphabet size `k` and window width `n`, the output necessarily has `k^n` digits. The FKM construction takes `O(k^n)` time to emit the sequence and uses `O(nk)` auxiliary working space apart from the output. The demonstration's explicit checker additionally uses `O(k^n)` memory to mark seen windows.

## One-Minute Insight

> Overlap turns 10,000 separate combinations into one shortest possible sequence.

This same combinatorial idea appears in test-pattern generation, coding theory, and exhaustive sequence design.
