# Hamming(7,4): Seven Bits That Can Repair Themselves

**One flipped bit can be located and repaired using just three extra parity bits — without knowing which bit was damaged.**

## The Curiosity

Imagine sending the four-bit message `1011` across a noisy connection. One bit flips along the way. How could the receiver recover the original message without asking for a resend?

Hamming(7,4) turns four data bits into seven transmitted bits. The three extra bits are carefully chosen so the *pattern of failed parity checks* identifies the damaged position.

## The Logic

Number the seven bit positions **from right to left**, starting at 1. Put data bits in positions **3, 5, 6, 7** and even-parity bits in positions **1, 2, 4**.

| Parity bit | Checks positions |
| --- | --- |
| 1 | 1, 3, 5, 7 |
| 2 | 2, 3, 6, 7 |
| 4 | 4, 5, 6, 7 |

Each group must contain an even number of `1` bits. The groups overlap intentionally: every position has a unique combination of memberships, matching its binary position number.

For data `1011`, the encoder produces `1100110` (shown left to right, position 7 down to 1).

Now flip position 5:

```text
Original:  1100110
Received:  1110110
                ^ position 5 (count from the right)
```

Parity group 1 fails, group 2 passes, and group 4 fails. Add the failed group numbers: **1 + 4 = 5**. This is the *syndrome*: the position to flip back.

```text
Data:      1011
Encoded:   1100110
Damaged:   1110110
Fixed bit: 5
Recovered: 1011
Verified 128 no-error/single-error cases.
```

## Why It Works

Positions 1 through 7 have distinct, nonzero three-bit binary addresses. Each parity check examines one bit of that address. A single flipped bit toggles exactly the checks associated with its address, so the three check results spell out its position.

A syndrome of **0** means no parity check failed. Under the assumption of *at most one* flipped bit, the decoder therefore recovers the original message exactly.

## The Important Limitation

Ordinary Hamming(7,4) **corrects one bit error**, not two. With two flipped bits, the syndrome can misleadingly point to a third position; blindly correcting it may produce the wrong message. The receiver cannot reliably distinguish one error from two. An extra overall parity bit produces extended Hamming(8,4), which can correct one error and detect (but not correct) two errors.

## Try It Yourself

Requires Java 17 or newer. From this episode's directory:

```bash
javac code.java
java code
```

The program also checks **all 16 four-bit messages**, both with no error and with a flip at each of the seven positions: `16 × 8 = 128` cases.

## Complexity

For this fixed seven-bit code, encoding and decoding both take **O(1) time and O(1) auxiliary space**. The example stores the whole codeword in one integer; it does not use a lookup table or a second copy of the original message.

## One-Minute Insight

**Redundancy can be structured as information.** Three parity bits do more than say "something changed": together, they tell you *where* a single change happened. This is the core idea behind error-correcting codes used in digital communication and memory systems (often with more advanced code variants).
