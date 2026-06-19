# The Secret Your `==` Operator Is Leaking

Most developers think of security as "don't store passwords in plaintext" or "use HTTPS." But there's a subtler class of vulnerability hiding in one of the most basic operations you write every day: string comparison.

---

## The Problem

When you compare two strings with `==`, nearly every language **short-circuits**: it stops the moment it finds a mismatched character. That's fast — and that's the problem.

An attacker can send thousands of guesses and precisely measure response times. Strings that match the first character take *slightly* longer than ones that fail immediately. By reading that timing signal, the attacker can deduce the secret **one character at a time** — no brute force needed.

This is a **timing attack**: extracting secret information from *how long* code takes to run, not from what it returns.

```
if request.token == SECRET_TOKEN:   # ← this line can be weaponized
    process_webhook()
```

---

## Example

```
Secret token: "abc123xyz"

Attacker sends "aXXXXXXXX" → comparison takes ~200ns  (matched 'a', continued)
Attacker sends "zXXXXXXXX" → comparison takes ~100ns  (failed at 'z', stopped)

Δ timing = ~100ns → first character is 'a'

Repeat for each position → full secret recovered without ever seeing it.
```

The attack works at scale: modern networks are noisy, but averaging thousands of requests makes the timing difference statistically clear.

---

## Why It Matters

This is not theoretical. Real exploits have targeted:

| Target | Method |
| :--- | :--- |
| **HMAC validation** | API webhook secret comparison |
| **Session tokens** | Cookie value comparison in auth middleware |
| **OAuth signatures** | Signature verification in OAuth 1.0 |
| **Password hashes** | Direct hash string comparison (before bcrypt was standard) |

Django, Rails, Flask, and Go's `net/http` all use constant-time comparison in their security-critical paths. You should too.

---

## Solution

The fix: **constant-time string comparison**. Compare *all* characters unconditionally, no matter how early a mismatch appears.

### The Insight

Instead of returning `False` the moment bytes differ, XOR every byte pair and accumulate the results:

```
result = 0
for each (byte_a, byte_b) in zip(val1, val2):
    result |= byte_a XOR byte_b
```

- `XOR` of identical bytes = `0`
- `XOR` of different bytes = nonzero
- `OR`-ing everything together: result stays `0` only if *all* bytes matched
- The loop **always runs to completion** — no short-circuit, no timing signal

### Length Check Subtlety

Don't return early on a length mismatch either — that's also a timing leak. Instead, record the length difference, keep going (padding with zeros), and fold it into the final result.

### Walkthrough

```
val1 = "abc"  → bytes [97, 98, 99]
val2 = "abX"  → bytes [97, 98, 88]

Step 1: 97 XOR 97 = 0   → result = 0  | 0  = 0
Step 2: 98 XOR 98 = 0   → result = 0  | 0  = 0
Step 3: 99 XOR 88 = 59  → result = 0  | 59 = 59

result != 0 → strings differ  ✓ (and we checked every byte)
```

---

## Code

### Python

```python
import hmac
import os


def constant_time_compare(val1: str, val2: str) -> bool:
    return hmac.compare_digest(val1.encode(), val2.encode())


def constant_time_compare_manual(val1: str, val2: str) -> bool:
    b1, b2 = val1.encode(), val2.encode()
    # Pad the shorter one so length itself reveals nothing
    if len(b1) != len(b2):
        b2 = b2.ljust(len(b1), b'\x00')
        result = 1  # mark as unequal due to length
    else:
        result = 0

    for a, b in zip(b1, b2):
        result |= a ^ b  # accumulate differences without branching

    return result == 0


if __name__ == "__main__":
    SECRET = os.environ.get("SECRET_TOKEN", "super-secret-key-42")

    tests = [
        ("super-secret-key-42", True),
        ("super-secret-key-43", False),
        ("wrong",               False),
        ("",                    False),
    ]

    for token, expected in tests:
        result = constant_time_compare(SECRET, token)
        status = "✓" if result == expected else "✗"
        print(f"{status}  '{token[:20]}'  →  {result}")
```

### JavaScript

```javascript
const crypto = require("crypto");

function constantTimeCompare(val1, val2) {
    const b1 = Buffer.from(val1);
    const b2 = Buffer.from(val2);

    // Buffers must be same length for timingSafeEqual
    if (b1.length !== b2.length) {
        // Still run a dummy comparison so length can't be timed
        crypto.timingSafeEqual(Buffer.alloc(b1.length), Buffer.alloc(b1.length));
        return false;
    }

    return crypto.timingSafeEqual(b1, b2);
}

// Manual version to show the mechanics
function constantTimeCompareManual(val1, val2) {
    const b1 = Buffer.from(val1);
    const b2 = Buffer.from(val2);
    const len = Math.max(b1.length, b2.length);
    let result = b1.length ^ b2.length; // nonzero if lengths differ

    for (let i = 0; i < len; i++) {
        result |= (b1[i] ?? 0) ^ (b2[i] ?? 0);
    }

    return result === 0;
}

const SECRET = process.env.SECRET_TOKEN ?? "super-secret-key-42";

const tests = [
    ["super-secret-key-42", true],
    ["super-secret-key-43", false],
    ["wrong",               false],
    ["",                    false],
];

for (const [token, expected] of tests) {
    const result = constantTimeCompare(SECRET, token);
    const status = result === expected ? "✓" : "✗";
    console.log(`${status}  '${token.slice(0, 20)}'  →  ${result}`);
}
```

---

## Complexity

| Dimension | Value |
| :--- | :--- |
| **Time** | O(n) — always scans the full length of the longer string |
| **Space** | O(1) — no extra allocations beyond the byte buffers |

The "cost" of constant-time comparison is intentional: you're trading a potential early exit for security. In practice the difference is nanoseconds — irrelevant for human-facing systems, critical for high-throughput APIs.

---

## One Minute Insight

> **The fastest code isn't always the safest.** Short-circuit evaluation is a beloved optimization — and a latent vulnerability whenever secrets are involved. Security code doesn't get to be lazy.

Every time you reach for `==` to compare a token, signature, or hash, ask: *is this value secret?* If yes, use `hmac.compare_digest` (Python), `crypto.timingSafeEqual` (Node), or your framework's built-in equivalent. One line swap. Zero excuses.

*Run `code.py` or `code.js` to see it in action.*
