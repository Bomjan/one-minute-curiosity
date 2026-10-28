# Gray Code: One Bit at a Time

Count from 0 to 7 so that every step flips exactly **one** bit — and the one-line trick `i ^ (i >> 1)` does it.

---

## The Problem

Plain binary counting is chaotic at boundaries: going from `011` (3) to `100` (4) flips **three bits at once**.

Picture a rotary dial with sensors. If the sensors don't flip at the exact same instant, you briefly read `111` or `000` — a wildly wrong angle. A glitch in the real world.

**Goal:** list all `n`-bit numbers so that consecutive values (including wrap-around) differ by exactly one bit.

## Example

```
n = 3
decimal  binary  gray
   0      000    000
   1      001    001
   2      010    011
   3      011    010
   4      100    110
   5      101    111
   6      110    101
   7      111    100
```

Every neighbouring pair differs in one bit — even `100 → 000` on wrap-around.

## Why It Matters

- **Hardware:** rotary/linear encoders use Gray code so a misread is off by one step, never a wild jump.
- **Karnaugh maps:** adjacent cells are ordered in Gray code.
- **Distributed/async systems:** counters crossing clock domains (FIFO pointers) are Gray-encoded so a half-synced read is still valid.
- **Search & testing:** enumerating subsets where each step adds/removes one item (cheap incremental updates).

## Solution

Reflect and prefix: the `(n+1)`-bit list is the `n`-bit list, then the same list reversed with a leading `1`.

```
1-bit: 0 1
2-bit: 00 01 | 11 10
```

The mirror guarantees the seam differs only in the new top bit. That recursion collapses into a bit trick:

> **gray(i) = i XOR (i >> 1)**

Each Gray bit says "does this bit differ from the one above it?" Decoding reverses it by XOR-ing all shifts: `n ^= g; g >>= 1` in a loop.

## Code

See [`code.py`](./code.py) and [`code.js`](./code.js).

```python
def gray_code(n):
    return [i ^ (i >> 1) for i in range(1 << n)]
```

```javascript
const grayCode = (n) => Array.from({ length: 1 << n }, (_, i) => i ^ (i >> 1));
```

## Complexity

- **Encode one value:** O(1) time and space.
- **Generate all:** O(2ⁿ) time and space (output size).
- **Decode:** O(log n-bit width) time, O(1) space.

## One Minute Insight

Glitch-proof systems aren't always made by faster hardware — sometimes by choosing a number order where *wrong reads can only be slightly wrong*.
