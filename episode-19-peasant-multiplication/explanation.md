# Episode 19: Multiply Without Multiplying

**What if you could multiply two numbers using only doubling, halving, and addition?**

## The trick

Russian peasant multiplication (also called binary multiplication) works by repeatedly doubling the first number and halving the second. Whenever the second number is odd, add the current first number to the answer.

For **47 × 42**:

| Doubled value | Halved value | Add? |
| ---: | ---: | :--- |
| 47 | 42 | No |
| 94 | 21 | Yes |
| 188 | 10 | No |
| 376 | 5 | Yes |
| 752 | 2 | No |
| 1504 | 1 | Yes |

The result is **94 + 376 + 1504 = 1974**.

## Why it works

Every nonnegative integer is a sum of powers of two. Here, `42 = 32 + 8 + 2`, so `47 × 42 = 47 × 32 + 47 × 8 + 47 × 2`. The odd/even check reads the rightmost binary digit of the halved number; doubling supplies the matching power-of-two multiple.

Each iteration preserves the invariant `answer + a × b = original product`: when `b` is odd, adding `a` compensates for dropping the final `1` bit before halving. When `b` is even, halving and doubling preserve the product directly.

## Run

Requires a JDK (Java 11 or later):

```bash
javac code.java && java code
```

Expected output:

```text
47 x 42 = 1974
Verified 40401 pairs
```

## What did we learn?

Binary representation turns multiplication into **O(log b)** iterations and **O(1)** extra space, where `b` is the second input. The demonstration accepts nonnegative integers and uses Java `long`; like ordinary `long` multiplication, it can overflow for sufficiently large inputs. This is a demonstration of the arithmetic idea, not a claim that it outperforms the CPU's multiplication instruction.
