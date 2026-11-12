# Episode 24: Count the Zeros in 1000! Without Computing It

**Hook:** The number 1000! has **249 trailing zeros**, and you can count them without ever calculating that enormous factorial.

## The logic

A trailing zero comes from a factor of 10 = 2 × 5. In a factorial, factors of 2 are more plentiful than factors of 5, so we only count the fives.

Every multiple of 5 contributes at least one factor of 5; every multiple of 25 contributes an *extra* one; multiples of 125 contribute another, and so on.

For 100!:

- Multiples of 5: floor(100 / 5) = 20
- Extra factors from multiples of 25: floor(100 / 25) = 4
- Total: **24 zeros**

In general:

`zeros(n!) = floor(n/5) + floor(n/25) + floor(n/125) + ...`

Repeated integer division by five implements this in **O(log_5 n) time and O(1) auxiliary space**, without constructing n!. The result fits in an ordinary Python integer.

## Run

From this episode folder:

```bash
python3 code.py
```

Expected: 10! → 2 zeros; 25! → 6; 100! → 24; 1000! → 249. The program also checks every n from 0 through 500 against the actual factorial.

## What did we learn?

Sometimes the structure of a number tells us what we need without calculating the number itself. This method counts *decimal* trailing zeros, assumes a nonnegative integer n, and does not count zeros in other bases.
