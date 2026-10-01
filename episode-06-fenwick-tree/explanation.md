# The Tree Hiding Inside a Binary Number

A Fenwick tree answers "what's the sum of the first *k* items?" **and** handles live updates, both in O(log n), using a plain array and one bit trick: `i & -i`.

---

## The Problem

You run a leaderboard with millions of players. Scores change constantly, and you need to answer *"how many points do players ranked 2 through 5 hold in total?"* instantly.

- A plain array: updates are O(1), but every range query scans O(n).
- A prefix-sum array: queries are O(1), but every update rewrites O(n) entries.

Can you make **both** fast?

---

## Example

```
scores = [5, 3, 7, 9, 6, 4, 1, 2]

range_sum(2, 5)  -> 7 + 9 + 6 + 4 = 26
add(3, +10)      -> the 9 becomes 19
range_sum(2, 5)  -> 36
prefix_sum(7)    -> 47
```

---

## Why It Matters

- **Databases & analytics:** running totals and rank counts over changing data.
- **Competitive programming:** counting inversions, order statistics, 2D range sums.
- **Systems:** frequency tables inside compressors (arithmetic coding) and online leaderboards.

It gives you the power of a segment tree for sums in about 10 lines of code and half the memory.

---

## The Logic

Write an index in binary. Its **lowest set bit** says how much this slot is responsible for:

```
index  binary  covers
  1    0001    [1]
  2    0010    [1..2]
  4    0100    [1..4]
  6    0110    [5..6]
  8    1000    [1..8]
```

- **Query:** to sum the first 7 items, take slot 7 (item 7), slot 6 (items 5-6), slot 4 (items 1-4). Each step removes the lowest set bit: `7 → 6 → 4 → 0`. At most log n steps, because a number only has so many bits.
- **Update:** adding to item 3 must fix every slot that covers it. Each step adds the lowest set bit: `3 → 4 → 8`. Again at most log n steps.

`i & -i` isolates the lowest set bit thanks to two's complement. That one expression *is* the tree; no pointers are ever stored.

---

## Complexity

- **Time:** O(log n) per update and query; O(n log n) to build by repeated adds.
- **Space:** O(n), just one array.

---

## The Result

The tree is implicit in the binary representation of the indices.

> **One Minute Insight:** The best data structures are sometimes not built, just *noticed* inside the numbers you already have.
