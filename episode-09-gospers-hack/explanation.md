# Episode 09: Gosper's Hack — Skip Straight to the Next Combination

**How do you choose exactly three items from eight without inspecting all 256 possible bit patterns? A bit trick jumps directly between the 56 valid choices.**

## The curiosity

Suppose each bit represents a switch: `1` means selected, `0` means not selected. You want every eight-bit number containing **exactly three `1`s**.

Brute force checks all `2^8 = 256` masks and rejects most of them. **Gosper's hack** produces the next *larger* integer with the same number of set bits, without scanning the intervening integers.

For example:

```text
00101100  (44, three 1s)
00110001  (49, three 1s)  <- next valid mask
```

The masks in between do not contain exactly three set bits.

## The logic

```java
int lowestOne = mask & -mask;
int ripple = mask + lowestOne;
int next = ripple | (((ripple ^ mask) >>> 2) / lowestOne);
```

1. `mask & -mask` isolates the lowest set bit. In Java's two's-complement arithmetic, `-mask` makes this possible.
2. Adding that bit (`ripple`) carries into the next available higher position.
3. `ripple ^ mask` identifies the bits that changed. Shifting right by two and dividing by `lowestOne` packs the displaced `1`s into the lowest positions.
4. OR-ing the two pieces gives the smallest number larger than `mask` with the same popcount (number of `1`s).

To enumerate choices, start at `(1 << k) - 1` (the smallest mask with `k` ones), repeatedly call `nextMask`, and stop when the result reaches `1 << n`.

## Try it

From this folder, with JDK 11 or newer:

```bash
javac code.java
java code
```

The lowercase public class `code` intentionally matches the required filename `code.java`.

The program prints the first eight masks for choosing three positions out of eight, reports **56 combinations**, and independently checks every generated mask against brute-force enumeration for all `1 <= k <= n <= 12`.

## Why it matters

This is useful for enumerating fixed-size subsets in combinatorial search, game-state exploration, and bitmask dynamic programming. Instead of scanning all `2^n` masks, it visits only the `C(n, k)` masks you actually want.

| Method | Masks inspected | Extra space |
| --- | --- | --- |
| Brute force + popcount | `2^n` | `O(1)` |
| Gosper's hack | `C(n, k)` | `O(1)` |

Each jump uses a constant number of fixed-width integer operations, so generating all combinations takes `O(C(n, k))` time (excluding printing).

## Important boundaries

- The demo supports `1 <= k <= n <= 30` using positive Java `int` masks. The signed bit and overflow make a naive 31- or 32-bit extension unsafe.
- The zero-selection case (`k = 0`) has one valid combination, the all-zero mask, but `nextMask(0)` is undefined because it would divide by zero.
- The technique generates combinations in **increasing numeric mask order**, not Gray-code order. Consecutive masks can change several bits.

## One-minute insight

**Sometimes the fastest search is not checking candidates faster; it is never generating the candidates that cannot qualify.**
