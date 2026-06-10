# Who's the Celebrity?

Every party has one. The person everyone knows, but who knows nobody back. Turns out, finding them is a puzzle with a brilliant one-pass trick most developers never see coming.

---

## The Problem

You're at a party with `n` people (numbered `0` to `n-1`). A **celebrity** is defined by two rules:

1. **Everyone else knows the celebrity.**
2. **The celebrity knows nobody.**

You have access to one helper: `knows(a, b)` — returns `true` if person `a` knows person `b`. Each call counts as one operation.

**Your goal:** Find the celebrity (or return `-1` if none exists) using the **fewest possible calls** to `knows()`.

The naive approach checks every pair → **O(n²) calls**. Can you do it in **O(n)**?

---

## Example

```
n = 4 people: [0, 1, 2, 3]

knows matrix:
        0    1    2    3
  0  [  -   true  true  true ]
  1  [ false  -   true  true ]
  2  [ false false  -   true ]
  3  [ false false false  -  ]

Celebrity: 3
  → Everyone (0, 1, 2) knows 3
  → 3 knows nobody
```

```
n = 3, nobody fits both rules → return -1
```

---

## Why It Matters

The Celebrity Problem is a template for **elimination-based search** — a pattern that shows up everywhere:

| Domain | Real-World Analogy |
| :--- | :--- |
| **Graph theory** | Finding a sink node (in-degree = n-1, out-degree = 0) in a directed graph |
| **Social networks** | The account followed by everyone that follows nobody |
| **Dependency graphs** | The root package that nobody depends on, but all others do |
| **Distributed systems** | Identifying the authoritative leader node in a cluster |
| **Code architecture** | Finding a module imported by all others but importing none |

The deeper lesson: **you don't need to check everything if each check eliminates a candidate.**

---

## Solution

### The Key Insight: One Question Eliminates One Person

Ask `knows(a, b)`:
- If `a` knows `b` → **a cannot be the celebrity** (celebrities know nobody). Eliminate `a`.
- If `a` doesn't know `b` → **b cannot be the celebrity** (celebrities are known by everyone). Eliminate `b`.

One call. One elimination. Every time.

With `n` people, `n - 1` calls reduce the field to **exactly one candidate**. Then do a single O(n) verification pass.

### Step-by-Step Walkthrough

```
People: [0, 1, 2, 3]  ← Use a stack

Round 1: Pop 3 and 2.
  knows(2, 3) = true → eliminate 2. Stack: [0, 1, 3]

Round 2: Pop 3 and 1.
  knows(1, 3) = true → eliminate 1. Stack: [0, 3]

Round 3: Pop 3 and 0.
  knows(0, 3) = true → eliminate 0. Stack: [3]

Candidate: 3

Verify 3:
  Does 3 know anyone? → knows(3,0)=F, knows(3,1)=F, knows(3,2)=F ✓
  Does everyone know 3? → knows(0,3)=T, knows(1,3)=T, knows(2,3)=T ✓

Answer: 3 ✓
```

Total calls: `(n - 1)` elimination + `2(n - 1)` verification = **O(n)**

---

## Code

### Python

```python
def find_celebrity(n, knows):
    # Elimination phase: narrow down to one candidate
    candidate = 0
    for i in range(1, n):
        if knows(candidate, i):
            candidate = i

    # Verification phase: confirm the candidate is a true celebrity
    for i in range(n):
        if i == candidate:
            continue
        if knows(candidate, i) or not knows(i, candidate):
            return -1

    return candidate


if __name__ == "__main__":
    matrix = [
        [False, True,  True,  True],
        [False, False, True,  True],
        [False, False, False, True],
        [False, False, False, False],
    ]

    def knows(a, b):
        return matrix[a][b]

    print(find_celebrity(4, knows))  # 3

    # No celebrity case
    matrix2 = [
        [False, True,  False],
        [False, False, True],
        [True,  False, False],
    ]

    def knows2(a, b):
        return matrix2[a][b]

    print(find_celebrity(3, knows2))  # -1
```

### JavaScript

```javascript
function findCelebrity(n, knows) {
    // Elimination phase
    let candidate = 0;
    for (let i = 1; i < n; i++) {
        if (knows(candidate, i)) candidate = i;
    }

    // Verification phase
    for (let i = 0; i < n; i++) {
        if (i === candidate) continue;
        if (knows(candidate, i) || !knows(i, candidate)) return -1;
    }

    return candidate;
}


const matrix = [
    [false, true,  true,  true],
    [false, false, true,  true],
    [false, false, false, true],
    [false, false, false, false],
];

const knows = (a, b) => matrix[a][b];

console.log(findCelebrity(4, knows));  // 3

const matrix2 = [
    [false, true,  false],
    [false, false, true],
    [true,  false, false],
];

const knows2 = (a, b) => matrix2[a][b];

console.log(findCelebrity(3, knows2));  // -1
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | n-1 elimination calls + 2(n-1) verification calls |
| **Space** | O(1) | Only a single `candidate` variable |

The brute-force approach that checks all `n²` pairs is correct but wasteful. This solution is **optimal** — you provably need at least `n - 1` calls to eliminate everyone else, and this does exactly that.

---

## One Minute Insight

> **Elimination beats enumeration.** Instead of exhaustively counting, ask one smart question that guarantees progress — each answer rules out a suspect. This is the core intuition behind algorithms like Boyer-Moore, binary search, and now the Celebrity Problem.

The celebrity is defined by a *global* property (everyone knows them, they know no one), but you discover them through *local* pairwise comparisons. One bit of information — knows or doesn't know — is enough to permanently discard one possibility. When each step is irreversible progress, O(n) becomes inevitable.

*Run `code.py` or `code.js` to see it in action.*
