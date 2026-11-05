# Episode 17: Jump to Any Permutation Without Generating the Others

**Hook:** There are 3,628,800 ways to arrange nine distinct items, but you can jump directly to any numbered arrangement without listing the preceding ones.

## The trick: factorial-sized blocks

For `n` distinct items, there are `n!` permutations. In lexicographic (dictionary) order, each choice of the first item owns a block of `(n-1)!` permutations.

To find the permutation at zero-based index `k`:

1. Divide `k` by `(n-1)!` to choose the first item from the sorted unused items.
2. Keep the remainder as the index inside that block.
3. Repeat with `(n-2)!`, then `(n-3)!`, down to `0! = 1`.

These successive quotients are **factoradic digits**: a mixed-radix representation of the index.

For five items and `k = 41` (the **42nd** permutation), the successive choices produce `2 4 5 3 1`.

## Run the experiment

Requires a JDK (Java 17 or newer). From this folder:

```bash
javac code.java
java code
```

Expected output:

```text
First: 1 2 3 4 5
42nd:  2 4 5 3 1
Last:  5 4 3 2 1
```

The filename and public class are both `code`, as required by the repository convention.

## Why it works

All permutations beginning with the same smallest available item are contiguous in lexicographic order. Each such block contains exactly `(n-1)!` permutations. Integer division identifies the block, and the remainder identifies the position within it. Applying the same argument recursively to the unused items gives the exact requested permutation.

The algorithm does **not** generate preceding permutations. With an `ArrayList`, selecting and removing an item costs up to `O(n)`, so total time is `O(n²)` and auxiliary space is `O(n)`. More advanced order-statistics structures can reduce selection costs.

## Boundaries

- `k` is zero-based, from `0` through `n! - 1`.
- The demo uses distinct integers `1..n`; repeated items need a different counting method.
- Java `long` safely stores `20!`, but not `21!`, so the implementation limits `n` to 20.
- This is **permutation unranking**, not random sampling. Choosing a uniformly random valid `k` would produce a uniformly random permutation.

**Takeaway:** Factorials are not just counts; they can act like place values, turning a permutation's rank into its exact arrangement.
