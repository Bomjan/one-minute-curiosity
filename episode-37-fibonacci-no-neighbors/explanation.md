# Fibonacci Numbers Hide in Binary Strings

## The Hook

Of the 1,048,576 possible 20-bit strings, exactly 17,711 contain no adjacent ones — a Fibonacci number.

## The Logic

Imagine choosing seats in a row without choosing two neighboring seats. A 1 means selected and a 0 means empty.

For three seats, the valid strings are 000, 001, 010, 100 and 101.

Let A(n) count valid strings of length n, including the empty string.

- If a string ends in 0, its preceding n-1 bits can be any valid string.
- If it ends in 1, the previous bit must be 0, leaving n-2 unrestricted-by-the-suffix positions that must themselves form a valid string.

Thus A(n) = A(n-1) + A(n-2) for n >= 2. With A(0) = 1 and A(1) = 2, this is exactly F(n+2), where F(0) = 0 and F(1) = 1.

To verify the result by enumeration, shift each nonnegative bitmask right by one position and AND it with the original. A nonzero result means two neighboring ones overlap.

## The Result

For n = 20, only 17,711 strings pass the test. The Java program checks every length from 0 through 20 against the recurrence.

Enumeration takes O(2^n) fixed-width operations for one length; the recurrence needs only O(n) additions and two running values. For arbitrary-size exact integers, arithmetic costs grow with the number of bits. The demonstration deliberately limits n to 20 to avoid Java int shift and overflow issues.

## Run

```bash
javac code.java && java code
```

Expected output: `17711 valid subsets`.
