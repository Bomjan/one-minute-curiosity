# When Speed Betrays Your Secrets

Your code can leak passwords — not through a bug, not through a breach — just by being *fast*.

---

## The Problem

You're building an API that validates a secret token. Your comparison looks innocent:

```python
if user_token == secret_token:
    grant_access()
```

But this single line has a hidden flaw. Python's `==` (and most string comparisons in any language) **stops comparing the moment it finds a mismatch**. The first wrong character ends the check immediately.

An attacker who can measure response times — even at millisecond or nanosecond resolution — can exploit this.

**The attack:** Send thousands of token guesses. Tokens that match the *first character* take slightly longer to reject than tokens that fail on the *first character*. The attacker uses this to guess the token **one character at a time**, reducing a brute-force search from `O(256^n)` to `O(256 × n)`.

---

## Example

```
Secret token:  "sk-abc123"

Attempt 1: "XXXXXXXX"  → fails at char 0 → response in 1.00 ms
Attempt 2: "sXXXXXXX"  → fails at char 1 → response in 1.01 ms  ← slightly slower!
Attempt 3: "skXXXXXX"  → fails at char 2 → response in 1.02 ms  ← slower again!
...
```

Each character that *matches* takes a tiny bit longer. By scanning through possibilities character by character, the attacker can reconstruct the full secret without ever triggering a login lockout.

---

## Why It Matters

Timing attacks are real, documented, and have broken real systems:

| Domain | Impact |
| :--- | :--- |
| **Authentication** | API keys, CSRF tokens, session cookies |
| **Cryptography** | RSA private key extraction via cache-timing |
| **Databases** | Password hash comparison in login endpoints |
| **Web security** | Webhook signature verification (Stripe, GitHub) |

GitHub's webhook signature verification, Stripe's payment callback validation — all of these explicitly use constant-time comparison for exactly this reason.

---

## Solution

### The Fix: Constant-Time Comparison

Compare **all bytes, always** — regardless of where the first mismatch occurs. Never short-circuit.

**Naive approach (vulnerable):**
```
stop as soon as chars differ → leaks position information
```

**Constant-time approach (safe):**
```
XOR every byte pair → accumulate differences → check if total is zero
```

The key insight: `a XOR a = 0`. If every byte pair is identical, the accumulated OR of all XORs is `0`. But you always process every byte — no early exit, no timing leak.

**Implementation strategy:**
1. XOR corresponding bytes of both strings
2. OR all the XOR results together
3. A result of `0` means all bytes matched — grant access
4. A non-zero result means at least one byte differed — deny access

The time taken is always proportional to the *length* of the token, never to where the first mismatch occurs.

---

### Step-by-Step Walkthrough

```
secret = "abc"
guess  = "axc"

Byte 0: 'a' XOR 'a' = 0x00
Byte 1: 'b' XOR 'x' = 0x1A  ← mismatch, but we keep going
Byte 2: 'c' XOR 'c' = 0x00

Accumulated OR: 0x00 | 0x1A | 0x00 = 0x1A  → non-zero → DENY

Time taken: always proportional to len("abc") = 3, not to which byte differed.
```

An attacker measuring response time sees the same duration regardless of how many characters they got right.

---

## Code

### Python

```python
import hmac
import os

def safe_compare(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())

def unsafe_compare(a: str, b: str) -> bool:
    return a == b  # vulnerable: short-circuits on first mismatch


SECRET_TOKEN = os.environ.get("API_TOKEN", "sk-super-secret-value")

def verify_request(user_token: str) -> bool:
    return safe_compare(user_token, SECRET_TOKEN)


if __name__ == "__main__":
    print(safe_compare("hello", "hello"))   # True
    print(safe_compare("hello", "hellx"))   # False
    print(safe_compare("abc", "xyz"))       # False

    print(verify_request("sk-super-secret-value"))  # True
    print(verify_request("sk-wrong-value"))          # False
```

### JavaScript

```javascript
const crypto = require("crypto");

function safeCompare(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // crypto.timingSafeEqual requires equal-length buffers
    if (bufA.length !== bufB.length) {
        // Still do a comparison to avoid leaking length info via timing
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

function unsafeCompare(a, b) {
    return a === b; // vulnerable
}


const SECRET_TOKEN = process.env.API_TOKEN ?? "sk-super-secret-value";

function verifyRequest(userToken) {
    return safeCompare(userToken, SECRET_TOKEN);
}

console.log(safeCompare("hello", "hello"));  // true
console.log(safeCompare("hello", "hellx"));  // false
console.log(safeCompare("abc", "xyz"));      // false

console.log(verifyRequest("sk-super-secret-value")); // true
console.log(verifyRequest("sk-wrong-value"));         // false
```

---

## Complexity

| Dimension | Vulnerable `==` | Constant-Time `compare_digest` |
| :--- | :--- | :--- |
| **Time** | O(k) where k = position of first mismatch | O(n) always — full length processed |
| **Space** | O(1) | O(1) |
| **Security** | Leaks character-by-character position | No timing signal to an attacker |

The constant-time version is *slightly* slower in the average case — and that's the entire point. You're paying a tiny performance price to eliminate an entire class of side-channel attacks.

---

## One Minute Insight

> **"Correct" and "secure" are not the same thing.** `"abc" == "abc"` returns the right answer — but it also tells an attacker *how many characters they got right*. Security requires that your code behaves identically regardless of input, including how long it takes.

This is the essence of **side-channel attacks**: the computation itself is not the vulnerability — the *observable behavior* of the computation is. Execution time, power draw, cache misses, even sound from a CPU fan have all been used to extract cryptographic keys.

The rule is simple: **any comparison involving a secret must be constant-time**. Use `hmac.compare_digest` in Python, `crypto.timingSafeEqual` in Node.js, and never roll your own.

*Run `code.py` or `code.js` to see safe vs. unsafe comparison in action.*
