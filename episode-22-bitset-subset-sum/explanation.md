# Episode 22 — Solve Thousands of Subset Sums with One Shift

**The hook:** A single large integer can track *every achievable subset sum*, and each new number updates them all with one shift and one OR.

## The logic

Suppose we have `[3, 5, 7]` and want to know whether some subset adds up to 10.

Treat the binary digits of a large integer as a table: **bit `s` is 1 exactly when sum `s` is achievable**.

Initially only sum 0 is possible, so `bits = 1` (binary `...0001`).

For each nonnegative value `x`:

```java
bits = bits.or(bits.shiftLeft(x));
```

- `bits` preserves all sums that do **not** use `x`.
- `bits << x` marks sums formed by adding `x` to a previously achievable sum.
- OR combines both choices. Because the right-hand side uses the **old** bitset, each input element is used at most once.

After processing 3 and 5, achievable sums are 0, 3, 5, 8. Adding 7 also makes 7, 10, 12, 15 achievable. Thus 10 is possible (3 + 7), while 6 is not.

In Java, `BigInteger` provides an arbitrary-width, nonnegative bitset through `shiftLeft`, `or`, and `testBit`.

## The result

This is **bitset subset-sum dynamic programming**: many Boolean DP states are packed into machine words, allowing bit-parallel updates. It is not a constant-time solution: if the total sum is `S`, the bitset uses O(S) bits and each update processes up to O(S / w) machine words (ignoring implementation overhead), for roughly O(nS / w) word operations over `n` values. It is **pseudo-polynomial**, not polynomial in the number of input bits, and large sums can consume substantial memory.

The demonstration uses nonnegative integers and compares the bitset with an independent descending-loop Boolean DP across 4,096 six-element input arrays. It is meant for modest total sums, not enormous values.

## Run

From this episode folder (Java 11+):

```bash
javac code.java && java code
```

Expected output:

```text
Numbers: [3, 5, 7]
Can make 10? true
Can make 6? false
Verified 4096 input arrays against independent DP.
```
