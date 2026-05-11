# The Array That Secretly Has Cycles

Every array of `n+1` integers drawn from `[1, n]` is hiding a linked list — and if there's a duplicate, that linked list has a cycle. Most developers never see it.

---

## The Problem

You're given an array of `n+1` integers where every value is in the range `[1, n]`. Exactly one number is duplicated (it may appear more than twice). Find it.

**Hard mode rules (the interesting constraints):**
- You **cannot** modify the array
- You **cannot** use a hash set or extra O(n) memory
- You must solve it in O(n) time and O(1) space

> This is not a trick question. It has a clean, elegant solution — you just have to see the array differently.

---

## Example

```
Input:  [1, 3, 4, 2, 2]
Output: 2

Input:  [3, 1, 3, 4, 2]
Output: 3
```

---

## Why It Matters

Cycle detection is one of the most underrated techniques in computer science. It shows up in:

| Domain | Example |
| :--- | :--- |
| **Web crawlers** | Detecting redirect loops (`A → B → C → A`) |
| **Build systems** | Circular dependency detection (npm, Maven) |
| **Operating systems** | Deadlock detection in resource allocation graphs |
| **Blockchain** | Detecting state machine loops in smart contracts |
| **Memory debuggers** | Detecting corrupt linked list pointers |

The technique powering this solution — **Floyd's Tortoise and Hare** — was designed for linked lists, but it works on anything that behaves like one.

---

## Solution

### The Insight: Your Array Is a Linked List

Define a pointer that starts at index `0` and always jumps to `arr[current_index]`:

```
arr = [1, 3, 4, 2, 2]
 idx:  0  1  2  3  4

0 → arr[0]=1 → arr[1]=3 → arr[3]=2 → arr[2]=4 → arr[4]=2 → arr[2]=4 → ∞
```

The path **enters a cycle** because `2` appears at both index 2 and index 4. Two indices point into the same value — that's what creates the loop. The **cycle entry point = the duplicate**.

### Floyd's Tortoise and Hare (Two Phases)

**Phase 1 — Find the meeting point inside the cycle:**
- `slow` moves 1 step at a time: `slow = arr[slow]`
- `fast` moves 2 steps at a time: `fast = arr[arr[fast]]`
- They are guaranteed to meet somewhere inside the cycle.

**Phase 2 — Find the cycle entry (= the duplicate):**
- Reset `slow` to `arr[0]` (the start). Keep `fast` at the meeting point.
- Move both 1 step at a time.
- Where they meet = the start of the cycle = the duplicate.

**Why does Phase 2 work?** There's a mathematical proof: the distance from the start to the cycle entry equals the distance from the meeting point to the cycle entry (modulo the cycle length). Moving both pointers at speed 1 syncs them at the entry.

### Walkthrough

```
arr = [1, 3, 4, 2, 2]

Phase 1:
  slow=1, fast=3
  slow=3, fast=2
  slow=2, fast=2   ← met at index 2

Phase 2:
  slow=1 (reset), fast=2
  slow=3,          fast=4
  slow=2,          fast=2   ← met at 2

Duplicate = 2 ✓
```

---

## Code

### Python

```python
def find_duplicate(nums):
    slow = nums[0]
    fast = nums[0]

    # Phase 1: find meeting point inside the cycle
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break

    # Phase 2: find cycle entry = duplicate
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]

    return slow


if __name__ == "__main__":
    print(find_duplicate([1, 3, 4, 2, 2]))  # 2
    print(find_duplicate([3, 1, 3, 4, 2]))  # 3
    print(find_duplicate([2, 2, 2, 2, 2]))  # 2
```

### JavaScript

```javascript
function findDuplicate(nums) {
    let slow = nums[0];
    let fast = nums[0];

    // Phase 1: find meeting point inside the cycle
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);

    // Phase 2: find cycle entry = duplicate
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }

    return slow;
}

console.log(findDuplicate([1, 3, 4, 2, 2])); // 2
console.log(findDuplicate([3, 1, 3, 4, 2])); // 3
console.log(findDuplicate([2, 2, 2, 2, 2])); // 2
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(n) — two linear passes through the implicit linked list |
| **Space** | O(1) — only two pointers, regardless of array size |

Sorting would cost O(n log n). A hash set would cost O(n) space. Floyd's approach beats both constraints simultaneously.

---

## One Minute Insight

> **Arrays are not just arrays.** When values can act as indices, an array secretly encodes a directed graph. A duplicate creates two edges pointing to the same node — which means a cycle. Floyd's algorithm doesn't care whether the "pointers" are memory addresses or integer indices. The math is the same.

The lesson: before reaching for a hash map, ask whether your data structure already contains the information you need — just in a shape you haven't noticed yet.

*Run `code.py` or `code.js` to see it in action.*
