# The Vote That Can't Be Cheated

Every election has a secret mathematical property. If a candidate wins more than half the votes, no coalition of losers can unseat them — even if they band together perfectly. Boyer-Moore found a way to exploit this in a single pass with two variables.

---

## The Problem

You're given an array of `n` votes. A candidate **wins** if they appear **more than n/2 times** (a strict majority). Find the winner.

**Constraints that make it interesting:**
- You **cannot** use a hash map or frequency table
- You **cannot** sort the array
- You must solve it in **O(n) time** and **O(1) space** — one pass, two variables

---

## Example

```
Input:  [2, 2, 1, 1, 1, 2, 2]
Output: 2

Input:  [3, 2, 3]
Output: 3

Input:  [1]
Output: 1
```

---

## Why It Matters

Majority voting is not just a coding puzzle — it's the mathematical backbone of resilient systems:

| Domain | Where It Appears |
| :--- | :--- |
| **Distributed consensus** | Raft and Paxos require a quorum (majority) to commit a log entry |
| **Fault-tolerant computing** | Space shuttles use 3-of-5 voting hardware to mask sensor failures |
| **Data streams** | Finding the dominant item in a live feed without buffering all data |
| **Sensor fusion** | Selecting the correct reading among noisy, contradictory sensors |
| **Blockchain** | Proof-of-stake validators reach finality via a 2/3 supermajority |

The Boyer-Moore algorithm proves: if a majority *exists*, one pass is enough to find it.

---

## Solution

### The Insight: Elimination by Cancellation

Imagine every element as a gladiator. Whenever two *different* gladiators meet, they cancel each other out (both die). The majority element appears more than n/2 times — meaning it outnumbers all others *combined*. After all cancellations, it is the last one standing.

**The Algorithm:**
1. Track a `candidate` and a `count`, both starting at 0.
2. For each element in the array:
   - If `count == 0`: this element becomes the new `candidate`
   - Else if the element **matches** `candidate`: increment `count`
   - Else: decrement `count` (a cancellation occurs)
3. Return `candidate`.

The majority element can never be fully cancelled — it always has enough occurrences to outlast all opposition.

---

### Step-by-Step Walkthrough

```
Input: [2, 2, 1, 1, 1, 2, 2]

Step 1: count=0  → candidate=2, count=1
Step 2: 2==2     → candidate=2, count=2
Step 3: 1≠2      → candidate=2, count=1   (one cancellation)
Step 4: 1≠2      → candidate=2, count=0   (another cancellation)
Step 5: count=0  → candidate=1, count=1
Step 6: 2≠1      → candidate=1, count=0   (cancellation)
Step 7: count=0  → candidate=2, count=1

Final candidate: 2 ✓
```

Notice: `2` appears 4 times in a 7-element array (4 > 7/2 = 3.5). The "survivors" in step 7 are always from the majority group.

---

## Code

### Python

```python
def majority_vote(nums):
    candidate, count = None, 0

    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1

    return candidate


if __name__ == "__main__":
    print(majority_vote([2, 2, 1, 1, 1, 2, 2]))  # 2
    print(majority_vote([3, 2, 3]))               # 3
    print(majority_vote([1]))                     # 1
    print(majority_vote([6, 6, 6, 7, 7]))         # 6
```

### JavaScript

```javascript
function majorityVote(nums) {
    let candidate = null;
    let count = 0;

    for (const num of nums) {
        if (count === 0) candidate = num;
        count += num === candidate ? 1 : -1;
    }

    return candidate;
}

console.log(majorityVote([2, 2, 1, 1, 1, 2, 2])); // 2
console.log(majorityVote([3, 2, 3]));               // 3
console.log(majorityVote([1]));                     // 1
console.log(majorityVote([6, 6, 6, 7, 7]));         // 6
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | Single pass through the array |
| **Space** | O(1) | Only two variables: `candidate` and `count` |

A hash map approach is also O(n) time but costs O(n) space. Boyer-Moore achieves the same time bound with constant space — a strict improvement.

---

## One Minute Insight

> **Cancellation is a superpower.** Boyer-Moore doesn't find the majority by *counting* — it finds it by *elimination*. Two different elements always cancel each other. Whatever can't be cancelled is the majority.

This is exactly the logic behind quorum consensus in distributed systems: if more than half the nodes agree, no dissenting view can "survive" — it will always be cancelled out before it accumulates enough weight to win.

When you see Raft achieve consensus with `(n/2 + 1)` nodes, or a fault-tolerant chip require 3-of-5 agreement, you're watching Boyer-Moore play out in silicon and network packets.

*Run `code.py` or `code.js` to see it in action.*
