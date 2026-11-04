# Episode 16: Gray Code — Count Without Flipping Two Bits

**What if you could count through every 4-bit value while changing exactly one bit at a time?**

## The hook

Ordinary binary counting can flip several bits at once: `0111 → 1000` changes all four. Gray code rearranges the same 16 patterns so that *every adjacent pair* differs in exactly one bit.

## The logic

For a nonnegative integer `n`, its binary-reflected Gray code is:

```java
int g = n ^ (n >>> 1);
```

The right shift moves each binary digit one position right; XOR marks where neighboring binary digits differ. This produces the sequence:

```text
0000 0001 0011 0010 0110 0111 0101 0100
1100 1101 1111 1110 1010 1011 1001 1000
```

All 16 four-bit patterns appear exactly once, and even the final `1000` and initial `0000` differ by only one bit.

**Why does it work?** When incrementing a binary number, a suffix of ones becomes zeros and the preceding zero becomes one. The XOR with the shifted value cancels the multiple flips, leaving exactly one changed Gray-code bit.

## Try it

Requires a JDK (Java 17 or later). From this episode's folder:

```bash
javac code.java
java code
```

The program prints each value and checks uniqueness, every consecutive one-bit change, and the final-to-first transition. It throws an `AssertionError` if a check fails.

## Why it matters

Gray codes are used in rotary encoders and other position sensors, where changing only one bit between adjacent positions reduces ambiguity during transitions. They also help enumerate subsets with a single membership change at each step.

**The result:** `n ^ (n >>> 1)` visits all `2^k` k-bit patterns in an order where neighboring patterns differ in one bit. Computing one code takes constant time for a fixed-width Java `int`; printing the entire sequence takes O(2^k) steps and the demo uses O(2^k) memory to verify uniqueness.
