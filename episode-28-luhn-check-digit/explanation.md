# Episode 28: One Extra Digit Can Catch Every Single-Digit Typo

## The Hook
A single check digit can detect **every one-digit substitution error** in a decimal identifier, without storing a copy of the original number.

## The Logic
The **Luhn algorithm** appends a digit so a weighted sum is divisible by 10.

1. Starting at the right of the **complete number**, double every second digit (the second, fourth, etc.).
2. If a doubled digit exceeds 9, subtract 9. This is equivalent to adding its decimal digits.
3. Add the resulting values. A valid number has a sum divisible by 10.
4. To generate a check digit, temporarily append `0`, calculate the sum, then choose the digit that makes the remainder zero.

Example: `7992739871` becomes `79927398713`. Replacing the last digit with `4` fails validation.

Why single-digit substitutions are caught: at any fixed position, each possible digit maps to a distinct contribution modulo 10 (either `d` or `2d - 9` when `d >= 5`). Changing one digit therefore changes the checksum by a nonzero amount modulo 10.

## The Result
One extra digit detects every single-digit substitution and most adjacent transpositions. **It does not detect all errors**: swapping `0` and `9` in adjacent positions can go unnoticed. Luhn is an error-detection checksum, **not** encryption, authentication, or proof that an identifier exists.

The demonstration tests all **99** possible single-digit substitutions of an 11-digit example.

## Run
Requires Python 3 (no external packages).

```bash
cd episode-28-luhn-check-digit
python3 code.py
```

Expected output:

```text
Generated: 79927398713
Valid: True
Changed digit valid: False
All 99 single-digit substitutions detected.
```

Runtime is O(n) per validation or check-digit generation for an n-digit identifier, with O(1) auxiliary space aside from the returned string. The example is a synthetic test identifier, not a real account number.
