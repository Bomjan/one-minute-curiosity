# The String Comparison That Whispers Your Password

Two functions can return the exact same `true` or `false` for every input — and still, one of them is a security hole. The bug isn't in *what* it returns. It's in *how long it takes to decide*.

---

## The Problem

Picture a bouncer checking your name against a guest list, one letter at a time, and pausing the instant a letter doesn't match. You can't see the list — but if you say names into a stopwatch, you can literally hear which letter is wrong by timing his pause.

That's exactly how `==` compares strings in most languages: it checks character by character and **stops the moment it finds a mismatch**. Correct behavior, wrong secret: `"hunter2" == "aaaaaaa"` fails almost instantly (first char is wrong), while `"hunter2" == "hunter1"` takes measurably longer (six correct characters before it gives up).

If that comparison guards a password, API token, or HMAC signature, an attacker who can measure response time — even over a noisy network, given enough repeated requests to average out jitter — can reconstruct the secret **one character at a time**, without ever seeing it. This is a **timing side channel**: information leaking through *how* an answer was computed, not through the answer itself.

---

## Example

Forget wall-clock time for a second and just count how many characters get checked before the naive comparison gives up — that count *is* the leak:

```
secret = "hunter2"

guess "aaaaaaa"  → mismatch at position 0 → 1 char checked
guess "haaaaaa"  → mismatch at position 1 → 2 chars checked
guess "hunteraa" → mismatch at position 6 → 7 chars checked
guess "hunter2"  → full match             → 8 chars checked
```

An attacker doesn't need to guess the whole password at once (26^8 tries). They guess **one position at a time**, keep whichever guess takes longest, then move to the next position — turning an exponential search into a linear one.

---

## Why It Matters

This isn't theoretical — timing attacks have broken real systems: early HMAC verification in web frameworks, session-cookie checks, Keyczar, and even game-console security chips. It's precisely why standard libraries ship a dedicated function for this:

- Python: `hmac.compare_digest`
- Node.js: `crypto.timingSafeEqual`
- Go: `subtle.ConstantTimeCompare`

Anywhere you compare secrets — API keys, signatures, session tokens, password-reset codes — a "correct" `==` is a vulnerability. The same principle scales up to cache-timing attacks on AES and speculative-execution leaks like Spectre: **the side channel is never the logical output, it's the resource consumed to produce it.**

---

## Solution

The fix doesn't change *what* gets compared — it changes the algorithm's promise: **touch every byte, every time, no matter what.**

1. If lengths differ, bail immediately (length usually isn't secret — digest sizes are public anyway).
2. Walk every character pair without ever exiting early.
3. XOR each pair together and OR the results into one accumulator — any mismatch anywhere sets a bit, but the loop never learns *where*.
4. The strings match only if the accumulator ends up exactly zero.

Because the loop always runs the same number of iterations doing the same work, the elapsed time no longer depends on *where* (or whether) a mismatch occurs.

---

## Code

### Python

```python
import hmac

def naive_compare(a: str, b: str) -> bool:
    """The vulnerable version — stops at the first mismatch."""
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:
            return False  # early exit leaks the mismatch position via timing
    return True


def constant_time_compare(a: str, b: str) -> bool:
    """Always inspects every byte, so timing reveals nothing."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)  # accumulates diffs, loop never shortcuts
    return result == 0


if __name__ == "__main__":
    secret = "hunter2"
    print(constant_time_compare(secret, "hunter2"))  # True
    print(constant_time_compare(secret, "hunter1"))  # False

    # In production, just use the audited standard library version:
    print(hmac.compare_digest(secret, "hunter2"))
```

### JavaScript

```javascript
const crypto = require("crypto");

// The vulnerable version — stops at the first mismatch.
function naiveCompare(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false; // early exit leaks timing info
    }
    return true;
}

// Always inspects every byte — elapsed time no longer depends on *where* it differs.
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

const secret = "hunter2";
console.log(constantTimeCompare(secret, "hunter2")); // true
console.log(constantTimeCompare(secret, "hunter1")); // false

// In production, prefer the audited standard library version:
console.log(crypto.timingSafeEqual(Buffer.from(secret), Buffer.from("hunter2")));
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(n) | Always — every byte is visited regardless of match location |
| **Space** | O(1) | Just one accumulator variable |

Both versions are technically O(n) in the worst case. The naive one is *also* O(1) in the best case — and that variance between best and worst case is exactly the leak. Constant-time comparison sacrifices the "fast path" on purpose, trading average-case speed for input-independent behavior.

---

## One Minute Insight

> Big-O measures the worst case. Security bugs live in the case that terminates *early*.

Correctness asks "what does this function return?" Security asks "what does it reveal *while deciding* what to return?" Any time a comparison guards a secret, the fastest code is the wrong code — you want every input to cost exactly the same, on purpose.

*Run `code.py` or `code.js` to see it in action.*
