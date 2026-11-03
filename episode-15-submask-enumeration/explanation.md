# Episode 15: A Two-Line Loop That Hides 3^n

**Hook:** A tiny bitwise loop visits every subset of a chosen set without allocating an array—and running it for *every* set reveals the surprising number **3^n**.

## The problem

Suppose a bitmask marks selected items. For example, `10110` means positions 1, 2, and 4 are selected (counting from the right, starting at zero). How do we visit all its subsets without checking every possible mask of the same width?

## The trick

```java
int sub = mask;
do {
    // Process sub here.
    sub = (sub - 1) & mask;
} while (sub != mask);
```

Subtracting one from `sub` clears its lowest set bit and turns the trailing lower bits into ones. AND-ing with `mask` removes any bits that were not in the original set. This produces the next smaller valid submask in descending numeric order. After the empty submask (zero), `(0 - 1) & mask` returns to `mask`, ending the loop. The same logic works for `mask == 0`: it visits zero once.

For `10110`, the sequence is:

```text
10110  10100  10010  10000
00110  00100  00010  00000
```

There are `2^3 = 8` submasks because the mask contains three set bits. The loop visits each one exactly once.

## Where does 3^n come from?

Consider all `2^n` possible masks over `n` bits, and enumerate all their submasks. For each bit there are **three** possible states:

1. Outside the mask.
2. Inside the mask, but outside the submask.
3. Inside both mask and submask.

That gives exactly `3^n` distinct ordered `(mask, submask)` pairs, rather than `4^n`. Equivalently, `sum(k=0..n) C(n,k) * 2^k = (1+2)^n = 3^n`.

For 10 bits, the Java demo checks **1,024 masks** and exactly **59,049 pairs**.

## Why it matters

Subset dynamic programming often needs to inspect every submask of a state, such as partitioning a small set into groups. The loop uses **O(1) auxiliary space** and **O(2^k)** time for one mask with `k` set bits. Enumerating all mask/submask pairs takes **O(3^n)** time.

## Run

From this episode folder:

```bash
javac code.java
java code
```

The filename `code.java` matches `public class code`. No dependencies are required. The demo prints the eight submasks of `10110`, verifies the count for all 10-bit masks, and asserts the total equals `3^10`.

**One-minute insight:** Each bit has three legal roles in a mask/submask pair; that is why a tiny bitwise loop leads to `3^n`.
