# The Sliding Lookout

A window slides across an array. At every position, you want the maximum. The obvious way scans the entire window each time — but there's a trick that makes each element enter and leave the picture exactly once.

---

## The Problem

You have an array of integers and a window of size `k`. As the window slides one position to the right, report the **maximum element** in each window position.

The brute-force scans `k` elements per step → **O(n·k)**. Can you do it in **O(n)** regardless of how large `k` is?

---

## Example

```
Input:  nums = [1, 3, -1, -3, 5, 3, 6, 7],  k = 3

Window            →  Max
[1  3  -1]           3
   [3  -1  -3]       3
      [-1  -3   5]   5
          [-3   5  3] 5
              [5  3  6] 6
                 [3  6  7] 7

Output: [3, 3, 5, 5, 6, 7]
```

---

## Why It Matters

Sliding window maximum is a primitive that powers:

| Domain | Application |
| :--- | :--- |
| **Stream processing** | Real-time peak detection over rolling time windows |
| **Image processing** | Max-pooling in convolutional neural networks |
| **Finance** | Rolling high-water marks, trailing stop-loss triggers |
| **Monitoring** | Alerting when peak latency exceeds threshold in last N seconds |
| **Operating systems** | Scheduler horizon: highest-priority task in a time slice window |

Every time you need a running aggregate over a moving window, this pattern applies — swap "max" for "min" and the same trick works.

---

## Solution

### The Key Insight: Kill Anything Useless

Before pushing a new element into the deque, ask:  
*"Is there anything already inside that can **never** be the max again?"*

An element at index `i` is **useless** if:
1. It's smaller than the new element (the newcomer will outlast it and is already bigger), **or**
2. Its index is outside the current window (it's stale).

A **monotonic deque** (double-ended queue) maintains indices in decreasing order of their values. The front always holds the index of the current window's maximum.

### Step-by-Step Walkthrough

```
nums = [1, 3, -1, -3, 5, 3, 6, 7],  k = 3
deque stores indices; values shown in parentheses for clarity.

i=0  val=1   deque: [0(1)]
i=1  val=3   pop 0(1) — 1 < 3, useless.  deque: [1(3)]
i=2  val=-1  -1 < 3, keep 1.              deque: [1(3), 2(-1)]   → window full → max = nums[1] = 3 ✓
i=3  val=-3  -3 < -1, keep 2.             deque: [1(3), 2(-1), 3(-3)] → front 1 still in window → max = 3 ✓
i=4  val=5   pop 3(-3), pop 2(-1), pop 1(3) — all ≤ 5.  deque: [4(5)]  → max = 5 ✓
i=5  val=3   3 < 5, keep 4.               deque: [4(5), 5(3)]   → max = 5 ✓
i=6  val=6   pop 5(3), pop 4(5).          deque: [6(6)]          → max = 6 ✓
i=7  val=7   pop 6(6).                    deque: [7(7)]          → max = 7 ✓
```

Every element is pushed once and popped at most once → **O(n) total**.

---

## Code

### Python

```python
from collections import deque

def sliding_window_maximum(nums, k):
    dq = deque()  # stores indices, values are decreasing
    result = []

    for i, val in enumerate(nums):
        # Remove indices that are outside the window
        if dq and dq[0] < i - k + 1:
            dq.popleft()

        # Remove indices whose values are smaller than current
        while dq and nums[dq[-1]] < val:
            dq.pop()

        dq.append(i)

        # Window is fully formed starting at index k-1
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result


if __name__ == "__main__":
    print(sliding_window_maximum([1, 3, -1, -3, 5, 3, 6, 7], 3))
    # [3, 3, 5, 5, 6, 7]

    print(sliding_window_maximum([9, 8, 7, 6, 5], 2))
    # [9, 8, 7, 6]

    print(sliding_window_maximum([1], 1))
    # [1]
```

### JavaScript

```javascript
function slidingWindowMaximum(nums, k) {
    const dq = [];  // monotonic deque of indices
    const result = [];

    for (let i = 0; i < nums.length; i++) {
        // Evict stale index from front
        if (dq.length && dq[0] < i - k + 1) dq.shift();

        // Evict smaller values from back
        while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop();

        dq.push(i);

        if (i >= k - 1) result.push(nums[dq[0]]);
    }

    return result;
}


console.log(slidingWindowMaximum([1, 3, -1, -3, 5, 3, 6, 7], 3));
// [3, 3, 5, 5, 6, 7]

console.log(slidingWindowMaximum([9, 8, 7, 6, 5], 2));
// [9, 8, 7, 6]

console.log(slidingWindowMaximum([1], 1));
// [1]
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | Each element is pushed and popped from the deque at most once |
| **Space** | O(k) | The deque holds at most k indices at any time |

The brute-force is O(n·k) — fine for small windows, painful when k approaches n (think: rolling 30-day maximum over years of tick data).

---

## One Minute Insight

> **Lazy deletion beats eager recomputation.** Instead of re-scanning the window after every shift, maintain a structure whose front is always the answer. The monotonic deque buys this by enforcing a simple invariant: *if you can never beat me, you're gone before I am.*

This is the same philosophy behind monotonic stacks (next greater element), priority queues with lazy removal, and segment trees. The insight scales: whenever you maintain an extremum over a moving range, ask what constraints allow you to discard candidates early — the answer is almost always a structure that enforces order at insertion time.

*Run `code.py` or `code.js` to see it in action.*
