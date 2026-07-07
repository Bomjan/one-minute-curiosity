# The Crystal Ball Stack

Every element in your array is waiting for something — the next value greater than itself. The naive approach peeks ahead for each element: O(n²). The smart approach inverts the question: instead of each element asking *"what's coming after me?"*, new arrivals ask *"who am I the answer for?"*

That's the Monotonic Stack. It answers future questions in a single forward pass.

---

## The Problem

Given an array of daily temperatures, find — for each day — how many days you'd have to wait until a warmer day arrives. If no warmer day ever comes, the answer is `0`.

```
Input:  [73, 74, 75, 71, 69, 72, 76, 73]
Output: [ 1,  1,  4,  2,  1,  1,  0,  0]
```

- Day 0 is 73°. Day 1 is 74° (warmer) → wait **1 day**.
- Day 2 is 75°. The next warmer day is day 6 (76°) → wait **4 days**.
- Day 6 is 76°. Nothing warmer follows → **0**.

---

## Example

```
Input:  [30, 60, 90, 50, 40, 80, 70, 100]
Output: [ 1,  1,  5,  2,  1,  2,  1,   0]

Input:  [60, 50, 40, 30]
Output: [ 0,  0,  0,  0]   ← already at peak, nothing warmer ahead
```

---

## Why It Matters

"Next greater element" is not a textbook toy — it shows up across real systems:

| Domain | Example |
| :--- | :--- |
| **Finance** | Stock span: how many consecutive days a stock stayed below today's price |
| **Compilers** | Balanced bracket matching, operator precedence parsing |
| **Image processing** | Largest rectangle in a histogram (used in chart rendering, text reflow) |
| **CSS / UI engines** | Finding the next visible sibling in a DOM traversal |
| **Systems** | Sliding window maximum in rate-limiter and stream analytics pipelines |

---

## Solution

### The Naive Way (O(n²))

For each day, scan every following day until you find one that's warmer. Two nested loops. Correct, but slow for large inputs.

### The Monotonic Stack (O(n))

**The key insight:** Use a stack as a holding area for *unresolved questions* — days that are still waiting to find their warmer future. When a new warmer day arrives, it resolves all the waiting days it qualifies for, popping them off the stack in one sweep.

**Algorithm:**

1. Keep a stack of **indices** (days still waiting for their answer).
2. For each new day `i`:
   - While the stack is not empty **and** `temps[i] > temps[stack.top()]`:
     - Pop index `j` — day `j` just found its warmer day.
     - `result[j] = i - j`
   - Push `i` onto the stack (it is now waiting for its own warmer day).
3. Any index left in the stack at the end has no warmer day → `result = 0`.

The stack stays **monotonically decreasing** in temperature — each entry is colder than the one below it. That invariant is what makes the algorithm correct and efficient.

### Walkthrough

```
temps = [73, 74, 75, 71, 69, 72, 76, 73]
         0    1   2   3   4   5   6   7

i=0: 73 → stack empty, push 0              stack=[0]
i=1: 74 > temps[0]=73 → pop 0, ans[0]=1-0=1
     push 1                                stack=[1]
i=2: 75 > temps[1]=74 → pop 1, ans[1]=2-1=1
     push 2                                stack=[2]
i=3: 71 < temps[2]=75 → push 3            stack=[2,3]
i=4: 69 < temps[3]=71 → push 4            stack=[2,3,4]
i=5: 72 > temps[4]=69 → pop 4, ans[4]=5-4=1
     72 > temps[3]=71 → pop 3, ans[3]=5-3=2
     72 < temps[2]=75 → push 5            stack=[2,5]
i=6: 76 > temps[5]=72 → pop 5, ans[5]=6-5=1
     76 > temps[2]=75 → pop 2, ans[2]=6-2=4
     stack empty → push 6                 stack=[6]
i=7: 73 < temps[6]=76 → push 7            stack=[6,7]

Remaining [6,7] → ans[6]=0, ans[7]=0

Result: [1, 1, 4, 2, 1, 1, 0, 0] ✓
```

Every index is pushed exactly once and popped at most once. That's why it's O(n).

---

## Code

### Python

```python
def daily_temperatures(temps):
    result = [0] * len(temps)
    stack = []  # indices of days still waiting for a warmer day

    for i, temp in enumerate(temps):
        while stack and temp > temps[stack[-1]]:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)

    return result


if __name__ == "__main__":
    test_cases = [
        ([73, 74, 75, 71, 69, 72, 76, 73], [1, 1, 4, 2, 1, 1, 0, 0]),
        ([30, 40, 50, 60],                  [1, 1, 1, 0]),
        ([60, 50, 40, 30],                  [0, 0, 0, 0]),
        ([30, 60, 90, 50, 40, 80, 70, 100], [1, 1, 5, 2, 1, 2, 1, 0]),
    ]

    for temps, expected in test_cases:
        result = daily_temperatures(temps)
        status = "✓" if result == expected else "✗"
        print(f"{status}  {temps}")
        print(f"     got:      {result}")
        print(f"     expected: {expected}\n")
```

### JavaScript

```javascript
function dailyTemperatures(temps) {
    const result = new Array(temps.length).fill(0);
    const stack = [];  // indices of days still waiting for a warmer day

    for (let i = 0; i < temps.length; i++) {
        while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
            const j = stack.pop();
            result[j] = i - j;
        }
        stack.push(i);
    }

    return result;
}

const testCases = [
    { input: [73, 74, 75, 71, 69, 72, 76, 73], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
    { input: [30, 40, 50, 60],                  expected: [1, 1, 1, 0] },
    { input: [60, 50, 40, 30],                  expected: [0, 0, 0, 0] },
    { input: [30, 60, 90, 50, 40, 80, 70, 100], expected: [1, 1, 5, 2, 1, 2, 1, 0] },
];

for (const { input, expected } of testCases) {
    const result = dailyTemperatures(input);
    const pass = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`${pass ? "✓" : "✗"}  [${input}]`);
    console.log(`     got:      [${result}]`);
    console.log(`     expected: [${expected}]\n`);
}
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(n) — each index is pushed once and popped at most once |
| **Space** | O(n) — the stack holds at most n indices in the worst case |

The O(n) time feels like magic because you're answering questions about *future* values — but no element is ever visited twice. The stack does the bookkeeping for free.

---

## One Minute Insight

> **A stack doesn't have to store values — it can store unresolved questions.** The monotonic stack works by deferring answers: when you can't resolve something yet, push it and keep moving. When the right value finally arrives, it resolves every waiting question it qualifies for in one efficient sweep.

The "monotonic" invariant — every element on the stack is smaller than the one below it — is what collapses a quadratic scan into a linear one. Once you see this pattern, you'll recognize it in stock span calculations, sliding window maximums, and the largest rectangle in a histogram.

*Run `code.py` or `code.js` to experiment with your own temperature arrays.*
