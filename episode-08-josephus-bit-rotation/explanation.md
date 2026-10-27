# Episode 08: The Last Person Standing Is Hidden in Binary

**Put 41 people in a circle, remove every second person, and the survivor is number 19. You can find them without simulating a single elimination.**

## The Curiosity

Number people from `1` to `n`. Start with person 1, eliminate person 2, then person 4, and keep counting around the circle, removing every second remaining person. Who survives?

This is the **Josephus problem with step size 2**. A queue simulation works, but there's a much stranger shortcut: rotate the leading `1` of `n`'s binary representation to the end.

## The Trick

Write `n` as the largest power of two not exceeding it, plus a remainder:

`n = 2^m + r`, where `0 <= r < 2^m`.

Then the survivor's **1-based** position is:

`J(n) = 2r + 1`.

For `n = 13`:

```text
13 in binary: 1101
Remove leading 1: 101
Append it:      1011 = 11

Largest power of two <= 13: 8
Remainder: 13 - 8 = 5
Survivor: 2 * 5 + 1 = 11
```

For `n = 41`, the highest power of two is 32, leaving 9. So the answer is `2 * 9 + 1 = 19`.

**Important:** This shortcut applies specifically when you eliminate **every second person**, starting by removing person 2. Other step sizes need a different recurrence or algorithm.

## Why It Works

For an even-sized circle, the first pass eliminates all even labels. The survivors are odd labels, so the smaller problem maps back using:

`J(2m) = 2J(m) - 1`.

For an odd-sized circle, the count wraps around and eliminates person 1 next, giving:

`J(2m + 1) = 2J(m) + 1`.

Starting with `J(1) = 1`, these rules lead to `J(2^m + r) = 2r + 1`. At a power of two, the survivor is always person 1; every person added afterward shifts the answer forward by two until the next power of two resets it.

## Try It in Java

From the repository root:

```bash
cd episode-08-josephus-bit-rotation
javac code.java
java code
```

Expected output:

```text
Seven-person elimination: 2 -> 4 -> 6 -> 1 -> 5 -> 3 -> 7
n=7, survivor=7
n=10, survivor=5
n=13, survivor=11
n=41, survivor=19
PASS: 2,048 cross-checks and known cases
```

The program compares the bit trick against an independent iterative recurrence for every `n` from 1 through 2,048. It also verifies the seven-person elimination order and boundary cases. The filename `code.java` matches `public class code`.

## Complexity

| Approach | Time | Extra space |
| --- | --- | --- |
| Queue simulation | O(n) | O(n) |
| Iterative Josephus recurrence | O(n) | O(1) |
| Highest-power-of-two bit trick | **O(1)** on fixed-width Java `int` | **O(1)** |

The constant-time claim assumes fixed-width machine integers, as in this Java implementation. With arbitrarily large integers, bit operations have a cost depending on their bit length.

## One-Minute Insight

> The survivor isn't found by watching the circle. It's found by moving one binary digit.

*Run [`code.java`](./code.java) and compare the simulated eliminations with the formula.*
