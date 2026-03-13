# Kaprekar's Constant (6174)

Kaprekar discovered that for almost every 4-digit number, repeatedly sorting and subtracting the digits eventually reaches the "Magic Number" **6174**.

## The Curiosity
Why does this specific number act as a "mathematical black hole" for 4-digit integers? Regardless of where you start, you are pulled into 6174.

## The Logic
1. **Pick**: Select any 4-digit number (e.g., `3524`).
2. **Sort**: Create the largest (`5432`) and smallest (`2345`) numbers possible from its digits.
3. **Subtract**: `5432 - 2345 = 3087`.
4. **Repeat**: Use the result (`3087`) and repeat.

## The Result
Within at most 7 iterations, you will arrive at **6174**. Once there, sorting and subtracting 6174 again (`7641 - 1467`) simply returns 6174, locking you in an infinite loop.

*Check `code.py` to run this experiment yourself!*
