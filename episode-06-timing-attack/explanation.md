# The Password Check That Leaks Its Own Secret

Comparing two strings feels like the safest operation in programming. It isn't — the *way* you compare them can whisper your secret to an attacker, one character at a time.

---

## The Problem

Say you're checking whether a submitted API key matches the one on file:

```python
if submitted_key == real_key:
    grant_access()
```

Looks harmless. But most `==` implementations compare character by character and **stop at the first mismatch**. That means:

- A guess that gets the *first* character right takes a few nanoseconds longer to reject than a guess that gets it wrong.
- A guess that gets the first **10** characters right takes longer still.

An attacker sitting on the network can't read your source code, but they can measure *response time*. By brute-forcing one character at a time and keeping whichever guess is slowest, they can reconstruct the entire secret — never once knowing it in advance. This is a **timing attack**, and it turns a fast rejection into a slow leak.

**Your goal:** compare two secrets in a way that takes the *same amount of time* no matter how many characters match.

---

## Example

```
real_key      = "a8f9c2"
naive compare:
  "000000" vs "a8f9c2" → mismatch at index 0 → ~1 step
  "a00000" vs "a8f9c2" → mismatch at index 1 → ~2 steps  ← slightly slower, and that's the leak
  "a8f000" vs "a8f9c2" → mismatch at index 3 → ~4 steps  ← slower still

constant-time compare:
  "000000" vs "a8f9c2" → always walks all 6 characters → ~6 steps
  "a8f9c2" vs "a8f9c2" → always walks all 6 characters → ~6 steps
```

The naive version's timing draws a map straight to the answer. The constant-time version gives the attacker nothing to measure.

---

## Why It Matters

This isn't a textbook curiosity — it's a real, historically-exploited class of bug:

| Domain | Where it bites |
| :--- | :--- |
| **Cybersecurity** | API key / HMAC / session-token verification (CVE reports exist for this exact bug) |
| **Web engineering** | Login forms, webhook signature checks (Stripe, GitHub all use constant-time compares) |
| **Cryptography** | Any place a secret is checked against user input — MACs, password reset tokens |
| **Systems design** | Reminds you that *side channels* (timing, memory access, power draw) can leak information that the logic layer never exposes |

The deeper lesson: **security bugs don't always live in the logic — sometimes they live in how long the logic takes to run.**

---

## Solution

### The Key Insight: Never Let the Loop Exit Early

A safe comparison must do **the same amount of work regardless of input** — no early `return False`, no short-circuiting `and`.

The trick: instead of comparing characters and bailing on the first mismatch, **accumulate differences with a bitwise OR** and only check the final result once, after scanning everything.

```
result = 0
for a, b in zip(secret, guess):
    result |= ord(a) ^ ord(b)
return result == 0
```

- `ord(a) ^ ord(b)` is `0` when the characters match, non-zero otherwise.
- OR-ing every character's result into `result` means one mismatch anywhere still requires walking the *entire* string — no shortcuts, no timing signal.
- Length is checked once, up front, using a fixed-time-safe library call where possible (in practice, use your language's built-in — `hmac.compare_digest` in Python, `crypto.timingSafeEqual` in Node).

### Step-by-Step Walkthrough

```
secret = "cat", guess = "cow"

i=0: 'c' ^ 'c' = 0   → result = 0
i=1: 'a' ^ 'o' = 14  → result = 14
i=2: 't' ^ 'w' = 4   → result = 14 | 4 = 10

Loop always runs all 3 iterations — win or lose, mismatch early or late.
Final: result != 0 → not equal
```

---

## Code

### Python

```python
import hmac
import os


def constant_time_equals(secret: str, guess: str) -> bool:
    """Compare two equal-length strings without leaking match position via timing."""
    if len(secret) != len(guess):
        return False

    result = 0
    for a, b in zip(secret, guess):
        result |= ord(a) ^ ord(b)  # accumulate; never branch on a single mismatch
    return result == 0


if __name__ == "__main__":
    real_key = "a8f9c2"

    # Prefer the standard library in real code — it's audited and constant-time.
    print(hmac.compare_digest(real_key, "a8f9c2"))  # True
    print(hmac.compare_digest(real_key, "000000"))  # False

    # Our from-scratch version, for understanding the mechanism:
    print(constant_time_equals(real_key, "a8f9c2"))  # True
    print(constant_time_equals(real_key, "a80000"))  # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function constantTimeEquals(secret, guess) {
    // Same length required up front — Buffer.compare needs matching sizes.
    if (secret.length !== guess.length) return false;

    const a = Buffer.from(secret, "utf8");
    const b = Buffer.from(guess, "utf8");

    // XOR every byte and OR the results together — no early exit possible.
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

const realKey = "a8f9c2";

// Prefer Node's built-in in real code — it's audited and constant-time.
console.log(crypto.timingSafeEqual(Buffer.from(realKey), Buffer.from("a8f9c2"))); // true

// Our from-scratch version, for understanding the mechanism:
console.log(constantTimeEquals(realKey, "a8f9c2")); // true
console.log(constantTimeEquals(realKey, "a80000")); // false
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) — always | The whole point: it's O(n) on *every* input, match or mismatch, so runtime carries no information |
| **Space** | O(1) | Just an accumulator; no extra buffers needed beyond the inputs themselves |

The naive `==` is also O(n) in the worst case — but its *best* case (early mismatch) is O(1), and that gap between best and worst case is exactly the side channel an attacker measures.

---

## One Minute Insight

> **An algorithm's correctness isn't the whole story — its *timing profile* is part of its behavior too.** When a comparison guards a secret, "fast when wrong" is a bug, not an optimization.

The fix costs almost nothing: a few extra nanoseconds per check, in exchange for closing a side channel that's been used to crack real systems. Next time you write `if input == secret`, ask whether an attacker gets to keep guessing — if so, reach for `hmac.compare_digest` or `crypto.timingSafeEqual` instead of the equals sign.

*Run `code.py` or `code.js` to see it in action.*
