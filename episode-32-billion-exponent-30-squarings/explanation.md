# Episode 32: A Billionth Power in About 30 Squarings

**The hook:** You can calculate `2^1,000,000,000 mod 1,000,000,007` without ever constructing the billionth power—and the exponent needs only 30 loop iterations.

## The logic

The trick is **binary exponentiation**, also called *exponentiation by squaring*.

Instead of multiplying by 2 a billion times, use the binary digits of the exponent:

- If the exponent is odd, multiply the current answer by the current base.
- Square the base, then halve the exponent (discarding any remainder).
- Reduce each multiplication modulo `m` immediately, because `(a × b) mod m = ((a mod m) × (b mod m)) mod m`.

For a tiny example, `2^10 mod 1000`:

| Exponent | Base (mod 1000) | Answer | Action |
| ---: | ---: | ---: | --- |
| 10 | 2 | 1 | Even: square base |
| 5 | 4 | 1 | Odd: multiply answer by 4 |
| 2 | 16 | 4 | Even: square base |
| 1 | 256 | 4 | Odd: multiply answer by 256 (mod 1000) |
| 0 | — | 24 | Done |

The code uses `exponent & 1` to check the last binary digit and `exponent >>= 1` to discard it.

## Try it

From this episode folder, run:

```bash
python3 code.py
```

Expected output:

```text
2^1,000,000,000 mod 1,000,000,007 = 140625001
Verified 11,025 cases against Python's built-in pow().
```

The tests compare every combination of 21 bases (-10 through 10), 21 exponents (0 through 20), and 25 positive moduli (1 through 25) with Python's independent built-in modular exponentiation.

## The result

The billion-sized exponent takes **30 iterations**, since its binary representation has 30 digits. Runtime is **O(log exponent)** modular multiplications, with **O(1)** extra integer variables (ignoring integer bit-width costs). For fixed-size moduli this is dramatically less work than repeated multiplication.

The method works for nonnegative integer exponents, positive moduli, and even negative bases. It does **not** calculate the full huge power: it calculates only its remainder. In Python, `pow(base, exponent, modulus)` already implements efficient modular exponentiation.

**Where it matters:** Modular arithmetic appears in cryptography, number theory, and programming contests. Real cryptographic implementations also need protections against timing and other side-channel attacks; this educational code is not a production cryptographic primitive.
