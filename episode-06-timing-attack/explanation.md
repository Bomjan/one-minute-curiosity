# The Leak Hiding in `==`

Two strings are either equal or they're not — a boolean, no gray area. But *how long* your computer takes to decide that boolean can leak the secret itself, one character at a time. That's a timing attack, and it hides in code that looks perfectly correct.

---

## The Problem

You write a function to check if a submitted API key matches the real one:

```python
def check_key(a, b):
    return a == b
```

Looks fine. It *is* functionally correct. But most string comparisons — including the naive loop most engineers reach for when reimplementing this by hand — **stop at the first mismatched character**. That means comparing `"Xyz..."` against a secret starting with `"S..."` finishes faster than comparing `"Sabc..."` against a secret starting with `"Sxyz..."`, because the second attempt got one character further before bailing out.

That timing difference is measurable — microseconds, but measurable over enough requests. An attacker doesn't need to guess the whole secret at once. They guess it **one character at a time**, keeping whichever guess makes the server respond slightly slower, because slower means "got further before failing."

**Your goal:** understand why "fast" comparison is a vulnerability in security code, and how to compare secrets in *constant time* instead.

---

## Example

Say the real key is `"S3cr3t!"` (7 characters). An attacker probes character by character:

```
Guess "Aaaaaaa" → fails at position 0 → ~0.1ms
Guess "Saaaaaa" → fails at position 1 → ~0.2ms   ← slower, keep the 'S'
Guess "S3aaaaa" → fails at position 2 → ~0.3ms   ← slower, keep the '3'
Guess "S3caaaa" → fails at position 3 → ~0.4ms   ← slower, keep the 'c'
...
Guess "S3cr3t!" → all positions match → success
```

Instead of brute-forcing `62^7` (case + digits) combinations, the attacker brute-forces roughly `62 × 7` — one alphabet pass per character. What was computationally infeasible becomes a coffee-break exercise.

---

## Why It Matters

This isn't academic. It's the reason security libraries ship dedicated "constant-time compare" functions instead of trusting `==`.

| Domain | Where this bites |
| :--- | :--- |
| **Cybersecurity** | Login systems comparing password hashes or session tokens |
| **Web engineering** | Verifying webhook signatures (Stripe, GitHub) via HMAC |
| **APIs / AI services** | Validating API keys before granting access to paid endpoints |
| **Networking** | Certificate or token validation in handshake protocols |
| **Databases** | Checking password-reset tokens before allowing a reset |

The pattern repeats: anywhere a server compares "the secret I have" against "the value you gave me," a naive comparison turns a *guessing* problem into a *measuring* problem — and measuring is much easier than guessing.

---

## Solution

### The Key Insight: Never Let Time Depend on *Where* It Failed

An early-exit comparison leaks information through a side channel (elapsed time) that has nothing to do with the return value. The fix is to make the comparison **always inspect every byte**, regardless of whether an earlier byte already mismatched — so the total work, and therefore the total time, is identical for every wrong guess.

The trick: instead of returning early on a mismatch, accumulate the differences with a bitwise OR, and only check the final accumulator at the end.

```
result = 0
for each position i:
    result |= byte_a[i] XOR byte_b[i]
return result == 0
```

- If `byte_a[i] == byte_b[i]`, the XOR is `0` — contributes nothing.
- If they differ anywhere, the XOR is nonzero, and OR-ing it in permanently flips `result` to nonzero.
- Every position gets visited, every single time. No shortcuts, no leak.

### Step-by-Step Walkthrough

```
a = "cat"     b = "car"

i=0: 'c' XOR 'c' = 0   → result = 0
i=1: 'a' XOR 'a' = 0   → result = 0
i=2: 't' XOR 'r' = 15  → result = 15 (nonzero, but we don't stop!)

Loop finishes regardless. Final check: result == 0? → False
```

Whether the mismatch happens at position 0 or position 2, the loop runs all 3 iterations either way. The attacker's stopwatch learns nothing.

(Length still leaks a tiny bit if `a` and `b` differ in size — real implementations compare lengths first, which is safe because length usually isn't the secret, and hash-based schemes normalize to a fixed length anyway.)

---

## Code

### Python

```python
import hmac
import os
import time


def insecure_equals(a: str, b: str) -> bool:
    """What most people write by hand — leaks timing info."""
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:
            return False  # early exit = the vulnerability
    return True


def constant_time_equals(a: str, b: str) -> bool:
    """Every byte is inspected, every time. No early exit."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0


if __name__ == "__main__":
    secret = "S3cr3t!"

    print(insecure_equals(secret, "S3cr3t!"))       # True
    print(constant_time_equals(secret, "S3cr3t!"))  # True

    # In production, don't hand-roll this — use the standard library:
    print(hmac.compare_digest(secret, "S3cr3t!"))   # True

    # A tiny demo of the timing gap insecure_equals introduces.
    def timeit(fn, guess, rounds=20000):
        start = time.perf_counter()
        for _ in range(rounds):
            fn(secret, guess)
        return (time.perf_counter() - start) / rounds

    near_miss = "S3cr3tX"   # wrong only in the last character
    far_miss = "Xxxxxxx"    # wrong from the very first character

    print("insecure, near miss :", timeit(insecure_equals, near_miss))
    print("insecure, far miss  :", timeit(insecure_equals, far_miss))
    print("constant, near miss :", timeit(constant_time_equals, near_miss))
    print("constant, far miss  :", timeit(constant_time_equals, far_miss))
```

### JavaScript

```javascript
const crypto = require("crypto");

function insecureEquals(a, b) {
  // What most people write by hand — leaks timing info.
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false; // early exit = the vulnerability
  }
  return true;
}

function constantTimeEquals(a, b) {
  // Every byte is inspected, every time. No early exit.
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const secret = "S3cr3t!";

console.log(insecureEquals(secret, "S3cr3t!"));       // true
console.log(constantTimeEquals(secret, "S3cr3t!"));   // true

// In production, don't hand-roll this — use the built-in:
console.log(
  crypto.timingSafeEqual(Buffer.from(secret), Buffer.from("S3cr3t!"))
); // true
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) always | The insecure version is O(1) best-case / O(n) worst-case — that *variance* is the bug. The constant-time version is O(n) unconditionally, so runtime carries no information. |
| **Space** | O(1) | Just an accumulator, no extra buffers. |

The fix doesn't make the algorithm asymptotically faster — it makes it asymptotically **boring**, and boring is exactly what you want when timing itself is an attack surface.

---

## One Minute Insight

> **In security code, uniform beats fast.** An early exit is a reasonable optimization everywhere else in software — and a vulnerability the moment one side of the comparison is a secret. The attacker doesn't need to break your crypto; they just need a stopwatch and patience.

*Run `code.py` or `code.js` to see it in action.*
