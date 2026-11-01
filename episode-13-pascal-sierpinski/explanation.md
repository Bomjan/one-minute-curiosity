# Pascal's Triangle Is Hiding a Fractal

**Color only the odd numbers in Pascal's triangle and a Sierpinski triangle appears — and a single bitwise AND tells you which numbers to color.**

## The Curiosity

Pascal's triangle starts like this:

```text
           1
          1 1
         1 2 1
        1 3 3 1
       1 4 6 4 1
      1 5 10 10 5 1
```

Replace each odd entry with `*` and each even entry with a space. The triangular holes repeat at smaller scales, producing the famous **Sierpinski triangle** pattern.

## The Bit Trick

The entry at zero-based row `n`, column `k` is the binomial coefficient `C(n, k)`.

**Lucas's theorem modulo 2** implies:

```java
boolean odd = (n & k) == k;
```

In binary, `C(n, k)` is odd exactly when **every 1-bit of `k` is also a 1-bit of `n`**.

For example, row 5 is binary `101`. The valid columns are `000` (0), `001` (1), `100` (4), and `101` (5). So the parity pattern of row 5 is `**  **` — no factorials or enormous binomial coefficients required.

## Why the Fractal Repeats

Each new binary digit creates three allowed `(n-bit, k-bit)` pairs: `(0,0)`, `(1,0)`, and `(1,1)`. The forbidden pair `(0,1)` creates the empty regions.

Across the first `2^m` rows, there are exactly `3^m` odd entries. Thus the first **32 rows** contain **243** stars, even though the triangle has `32 * 33 / 2 = 528` entries.

At row 7 (`111` in binary), every entry is odd. At row 8 (`1000`), only the two endpoints are odd. These transitions create the large triangular gaps.

## Run the Experiment

Requires Java 11 or newer (tested with Java 21).

```bash
cd episode-13-pascal-sierpinski
javac code.java
java code
```

The public class is deliberately named `code` to match the repository's `code.java` convention.

The program prints a centered, 32-row ASCII fractal. Before printing, it independently builds Pascal's triangle **modulo 2** using the recurrence

```text
C(n,k) mod 2 = (C(n-1,k-1) + C(n-1,k)) mod 2
```

(which is XOR for parity) and checks all **2,080 positions in the first 64 rows** against the bitwise test. It also asserts that the first 32 rows contain exactly 243 odd entries. A failed check throws an `AssertionError`.

## Complexity

- Testing whether one entry is odd: **O(1)** time and **O(1)** extra space for fixed-width Java integers.
- Printing `R` rows: **O(R²)** time for the triangular output; the parity rule itself needs no triangle storage.
- The optional verification uses **O(R)** extra space for a single row.

## One-Minute Insight

A simple binary operation reveals a self-similar geometric pattern inside a centuries-old arithmetic triangle. The surprising connection is not a coincidence: **the parity of binomial coefficients is encoded in the bits of their indices.**
