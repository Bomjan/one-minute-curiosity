# Episode 31: Count a Million Numbers Without Looking at Them

**Hook:** The digit `1` appears **600,001 times** between 0 and 1,000,000—and you can find that count by inspecting just seven decimal positions.

## The logic

Instead of looping over every number, count how often `1` appears in each place: ones, tens, hundreds, and so on.

At a place worth `p`, split the upper limit `n` into:
- `higher = n // (10 * p)`: complete blocks of length `10p`
- `current = (n // p) % 10`: the digit at this place
- `lower = n % p`: the unfinished portion below this place

Every complete block contributes exactly `p` occurrences of `1` at that position, so start with `higher * p`.

The incomplete block adds:
- **0** if `current == 0`
- **lower + 1** if `current == 1`
- **p** if `current > 1`

Add these contributions for `p = 1, 10, 100, ...` until `p > n`.

For `n = 13`, the ones place contributes 2 (1, 11), and the tens place contributes 4 (10, 11, 12, 13). Total: **6**.

For `n = 999`, each of its three positions contributes 100, giving **300**. Including 1,000,000 adds one more leading `1`, and the intermediate numbers contribute the rest: **600,001** occurrences through one million.

## Try it

Requires Python 3, with no dependencies:

```bash
python3 code.py
```

Expected output:

```text
0..13: 6 ones
0..99: 20 ones
0..100: 21 ones
0..999: 300 ones
0..1000: 301 ones
0..1000000: 600001 ones
Verified against brute force for n = 0..1000
```

## What did we learn?

Patterns in positional notation let us count across enormous ranges without enumerating their members. The algorithm takes **O(log₁₀ n)** iterations and **O(1)** auxiliary variables for nonnegative integer `n`. Python integers can grow arbitrarily large, so arithmetic on very large values is not constant-cost. The program also checks its answers against a straightforward implementation for 1,001 inputs.
