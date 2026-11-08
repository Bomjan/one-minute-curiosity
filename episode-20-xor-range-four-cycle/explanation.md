# Episode 20: XOR a Million Numbers in Constant Time

**The hook:** You can XOR every integer in a range—even a range containing a million values—using just two tiny formulas and no loop.

## The logic

XOR (`^`) cancels equal values: `x ^ x = 0`, and `x ^ 0 = x`. It is associative, so we can group terms however we like.

Let `F(n) = 0 ^ 1 ^ 2 ^ ... ^ n`, for nonnegative `n`. The results repeat in a four-case pattern:

| `n % 4` | `F(n)` |
| --- | --- |
| 0 | `n` |
| 1 | `1` |
| 2 | `n + 1` |
| 3 | `0` |

Why? Group consecutive values in blocks of four: `(4k) ^ (4k+1) ^ (4k+2) ^ (4k+3) = 0`. Every complete block cancels, leaving at most three trailing values. This produces the four cases above.

For any inclusive range `[L, R]`, the values below `L` cancel when we XOR two prefixes:

`XOR(L..R) = F(R) ^ F(L-1)`.

For `L = 0`, use `0` in place of `F(-1)`.

**Example:** `XOR(5..12) = F(12) ^ F(4) = 12 ^ 4 = 8`.

## The result

A potentially huge range XOR takes **O(1) time and O(1) extra space** for Java's fixed-width integers. The program independently checks 10,001 prefixes and 5,151 inclusive ranges against ordinary loops.

This trick is useful for range-XOR queries and understanding how XOR cancellation works. It assumes `0 <= L <= R` and nonnegative signed Java `int` inputs. The formula does not directly cover negative ranges; `n + 1` cannot overflow in its `n % 4 == 2` case for nonnegative `int` values.

## Run (Java 17+)

From this episode directory:

```bash
javac code.java && java code
```

Expected output:

```text
XOR of 5..12 = 8
Verified 10,001 prefixes and 5,151 ranges
```
