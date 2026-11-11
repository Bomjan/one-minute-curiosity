# Episode 23: Square Roots Without Floating Point

## The Hook
You can find the exact integer square root of a trillion using only integer division and a handful of Newton updates.

## The Logic
For a nonnegative integer `n`, the **integer square root** is `floor(sqrt(n))`: the largest integer `r` with `r*r <= n`. Computing `r*r` may overflow a fixed-width type, so division is safer.

Newton's method starts with an overestimate `x = n` (for `n >= 2`) and repeatedly averages `x` with `n / x`. If `x` is too large, `n / x` is smaller, so the estimate drops quickly. Once the next estimate would not decrease, the current estimate is the floor of the square root.

In Java, the update

```java
long next = x - (x - n / x + 1) / 2;
```

computes `floor((x + floor(n/x))/2)` without overflowing `long`. Since `x >= sqrt(n)` throughout, `x - n/x` is nonnegative. The `+1` rounds the difference upward before subtracting it.

For `n = 100`, the estimates are `100 -> 50 -> 26 -> 14 -> 10`; then the update stays at `10`. For `n = 1_000_000_000_000`, the result is exactly `1_000_000`.

## The Result
The algorithm avoids floating-point rounding and works even for `Long.MAX_VALUE`, whose integer square root is `3_037_000_499`. It takes very few iterations in practice; for a fixed-width Java `long`, the number of steps is bounded. This computes the **floor**, not a decimal approximation.

## Run
Requires a JDK:

```bash
javac code.java
java code
```

The program checks all 100,001 integers from 0 through 100,000 and the maximum signed 64-bit integer. Its assertions use division to avoid overflow.
