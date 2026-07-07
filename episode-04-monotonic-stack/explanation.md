# The Stack That Only Walks One Way

You can scan every element in an array, compare it to a pile of remembered candidates, and find the *next greater element* for all of them — in a single O(n) pass. The trick: the pile is never allowed to grow in the wrong direction.

---

## The Problem

You're given an array of integers. For each element, find the **next greater element** — the first value to its right that is strictly larger than it. If no such value exists, return `-1`.

```
Input:  [2, 1, 5, 3, 6, 4]
Output: [5, 5, 6, 6, -1, -1]
```

The brute-force approach scans right for each element: O(n²). Can you do it in O(n)?

---

## Example

```
Input:  [4, 3, 2, 1, 5]
Output: [5, 5, 5, 5, -1]

Trace:
  See 4 → nothing bigger yet, push 4
  See 3 → nothing bigger yet, push 3
  See 2 → push 2
  See 1 → push 1
  See 5 → 5 > 1, 5 > 2, 5 > 3, 5 > 4 → answer for all is 5, stack empty
  5 has no successor → answer is -1
```

---

## Why It Matters

The Monotonic Stack is a quiet workhorse across the industry:

| Domain | Real Usage |
| :--- | :--- |
| **Finance** | Stock span problem — how many consecutive days was the price lower? |
| **Compilers** | Parsing nested expressions, operator precedence |
| **UI/Graphics** | Largest rectangle in a histogram (basis of CSS layout engines) |
| **Competitive programming** | Daily temperatures, trapping rainwater, largest rectangle |
| **Data pipelines** | Sliding window maximum in stream processing |

LeetCode's "Daily Temperatures" problem (asked by Amazon, Google, Meta) is pure monotonic stack. So is "Trapping Rain Water" — one of the most famous interview problems ever written.

---

## Solution

### The Core Insight: Let Smaller Elements Wait

Instead of asking *"what comes next for each element?"*, flip it:

> When you see a larger element, you can **resolve** all the smaller waiting elements at once.

Keep a stack of elements that haven't found their answer yet. Every time you see a new value:

1. While the stack's top is **smaller** than the current value → pop it and record the current value as its answer.
2. Push the current value onto the stack.

The stack always stays in **decreasing order** from bottom to top — that's what makes it *monotonic*. Anything out of order gets evicted immediately.

### Walkthrough

```
Input: [2, 1, 5, 3, 6, 4]

i=0, val=2  → stack empty → push 2       stack: [2]
i=1, val=1  → 1 < 2, no pop → push 1     stack: [2, 1]
i=2, val=5  → 5 > 1 → ans[1]=5, pop 1    stack: [2]
             5 > 2 → ans[0]=5, pop 2    stack: []
             push 5                       stack: [5]
i=3, val=3  → 3 < 5, no pop → push 3     stack: [5, 3]
i=4, val=6  → 6 > 3 → ans[3]=6, pop 3    stack: [5]
             6 > 5 → ans[2]=6, pop 5    stack: []
             push 6                       stack: [6]
i=5, val=4  → 4 < 6, no pop → push 4     stack: [6, 4]

Remaining in stack → no next greater → ans = -1
Result: [5, 5, 6, 6, -1, -1] ✓
```

Each element is pushed once and popped once — O(n) total operations.

---

## Code

### Python

```python
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # stores indices of elements awaiting their answer

    for i, val in enumerate(nums):
        while stack and nums[stack[-1]] < val:
            idx = stack.pop()
            result[idx] = val
        stack.append(i)

    return result


if __name__ == "__main__":
    print(next_greater([2, 1, 5, 3, 6, 4]))  # [5, 5, 6, 6, -1, -1]
    print(next_greater([4, 3, 2, 1, 5]))      # [5, 5, 5, 5, -1]
    print(next_greater([1, 2, 3, 4, 5]))      # [2, 3, 4, 5, -1]
    print(next_greater([5, 4, 3, 2, 1]))      # [-1, -1, -1, -1, -1]
```

### JavaScript

```javascript
function nextGreater(nums) {
    const result = new Array(nums.length).fill(-1);
    const stack = []; // stores indices of elements awaiting their answer

    for (let i = 0; i < nums.length; i++) {
        while (stack.length > 0 && nums[stack.at(-1)] < nums[i]) {
            const idx = stack.pop();
            result[idx] = nums[i];
        }
        stack.push(i);
    }

    return result;
}

console.log(nextGreater([2, 1, 5, 3, 6, 4])); // [5, 5, 6, 6, -1, -1]
console.log(nextGreater([4, 3, 2, 1, 5]));     // [5, 5, 5, 5, -1]
console.log(nextGreater([1, 2, 3, 4, 5]));     // [2, 3, 4, 5, -1]
console.log(nextGreater([5, 4, 3, 2, 1]));     // [-1, -1, -1, -1, -1]
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(n) — each element is pushed and popped at most once |
| **Space** | O(n) — worst case the stack holds all elements (strictly decreasing input) |

The O(n) time is non-obvious. Even though there's a `while` loop inside a `for` loop, the total number of pops across the entire run can never exceed n — because each element is pushed exactly once.

---

## One Minute Insight

> **Brute force asks a question n times. The monotonic stack answers n questions in one sweep.**

The deeper lesson: when you notice that elements are waiting for the same kind of future event (a bigger value, a boundary, a closing bracket), a stack that enforces a monotonic order lets you batch-resolve all pending answers the moment that event arrives. The same pattern powers trapping rainwater, largest rectangle in histogram, and sliding window maximum — all in O(n).

*Run `code.py` or `code.js` to see it in action.*
