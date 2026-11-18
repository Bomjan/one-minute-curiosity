# Episode 30: Why 1/7 Repeats Forever (and Computers Can Find the Loop)

**Hook:** The decimal digits of 1/7 repeat `142857` forever—and a tiny dictionary can tell you exactly where *any* rational decimal starts looping.

## The logic

Long division doesn't need to remember all previous digits. It only needs the **remainder**.

For each step:
1. Multiply the current remainder by 10.
2. Divide by the denominator: the quotient is the next decimal digit, and the new remainder continues the process.
3. Remember the position where each remainder first appeared.

A remainder of **zero** means the decimal terminates. If a **nonzero remainder repeats**, the same future digits must repeat too: long division is deterministic.

For `1/7`, the remainders cycle through `1 → 3 → 2 → 6 → 4 → 5 → 1`. The resulting digits are `142857`, so `1/7 = 0.(142857)`. Parentheses indicate a repeating block.

Other examples:
- `1/2 = 0.5` (terminates)
- `1/3 = 0.(3)`
- `1/6 = 0.1(6)` (one nonrepeating digit before the loop)
- `1/13 = 0.(076923)`

## Why must it end or repeat?

With a positive denominator `d`, a remainder can only be `0, 1, ..., d-1`. Every nonzero remainder is among just `d-1` possibilities. So within at most `d` long-division steps, the remainder becomes zero or one previously seen remainder reappears. The repeating block can have at most `d-1` digits.

This is a finite-state-machine idea: **a deterministic process with finitely many states must eventually halt or revisit a state**.

## Run it

Requires Python 3; no packages.

```bash
python3 code.py
```

Expected output:

```text
1/2 = 0.5
1/3 = 0.(3)
1/6 = 0.1(6)
1/7 = 0.(142857)
1/13 = 0.(076923)
1/17 = 0.(0588235294117647)
```

## What did we learn?

Infinite-looking decimals can be described exactly by tracking a finite set of remainders. The program does not approximate with floating-point numbers: it prints the exact repeating structure.

**Complexity:** At most `O(d)` long-division steps and `O(d)` memory for denominator `d` (assuming ordinary fixed-size arithmetic). The code accepts nonnegative numerators and positive denominators. For very large integers, digit arithmetic also has a cost.
