# Episode 25 — Count Without Flipping Two Bits at Once

## The Hook
Ordinary binary counting can flip many bits at once, but **Gray code** visits every n-bit value while changing exactly **one bit** between consecutive values.

## The Logic
In normal binary, moving from `0111` (7) to `1000` (8) flips all four bits. That can be inconvenient for hardware sensors and rotary encoders: if bits change at slightly different times, a reader may momentarily observe an unintended intermediate value.

The *binary-reflected Gray code* of a nonnegative integer `i` is:

```python
gray = i ^ (i >> 1)
```

Here, `>> 1` shifts the binary representation right by one position and `^` is bitwise XOR. For 3 bits, the sequence is:

```text
000 → 001 → 011 → 010 → 110 → 111 → 101 → 100
```

Every adjacent pair differs in one bit. Even the last and first entries differ by one bit, making the sequence cyclic. All `2^n` bit patterns appear exactly once.

## Try It

From this folder:

```bash
python3 code.py
```

The program prints the 4-bit Gray code and checks uniqueness, every adjacent transition, and the final-to-first transition. No third-party packages are required.

## The Result
A single XOR expression turns a binary counter into a sequence with one-bit transitions. This is useful for encoding positions and reducing ambiguity during physical transitions, **but Gray code does not eliminate all hardware errors**: sampling noise and imperfect sensors still need handling.

Generating all `2^n` values takes O(2^n) time and O(2^n) storage in this list-based demo. Converting one integer to Gray code takes O(1) fixed-width machine operations.
