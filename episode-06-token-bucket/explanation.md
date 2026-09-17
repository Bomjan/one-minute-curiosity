# The Bucket That Never Overflows

Every API you've ever used is quietly running a tiny economy of permission slips. Here's the trick that lets it say "yes, go wild" one second and "slow down" the next — using nothing but two numbers.

---

## The Problem

You're building an API (or a login page, or an SMS gateway) and you need to stop any single client from hammering it. But a hard cap like "10 requests per minute, checked every 60 seconds" is clumsy — it either blocks legitimate bursts (someone loading a dashboard with 8 widgets at once) or lets a client blow through the limit right at the boundary of two windows.

You want something smarter:

- Allow **short bursts** of activity.
- Enforce a **long-term average rate**.
- Do it **without storing a timestamp for every request ever made**.

Imagine a bucket that holds tokens. Every request costs one token. The bucket refills at a steady drip, but never overflows past its capacity. No tokens left? You wait — or get turned away.

**Your goal:** decide, in O(1) time and O(1) memory, whether to allow or reject each incoming request.

---

## Example

```
Bucket capacity: 5 tokens
Refill rate:     1 token/second
Bucket starts:   full (5 tokens)

t=0s → 5 requests arrive back-to-back
       Request 1: ALLOW (tokens: 5 → 4)
       Request 2: ALLOW (tokens: 4 → 3)
       Request 3: ALLOW (tokens: 3 → 2)
       Request 4: ALLOW (tokens: 2 → 1)
       Request 5: ALLOW (tokens: 1 → 0)

t=0s → 1 more request arrives
       Request 6: DENY  (0 tokens, bucket is empty)

t=3s → 3 seconds pass, bucket refills 3 tokens (still capped at 5)
       Request 7: ALLOW (tokens: 3 → 2)
       Request 8: ALLOW (tokens: 2 → 1)
       Request 9: ALLOW (tokens: 1 → 0)
       Request 10: DENY (0 tokens — only 3 had refilled)
```

The burst of 5 sailed through instantly. The long-term rate still averages out to 1 request/second.

---

## Why It Matters

The **token bucket** is one of the most reused ideas in computing, hiding in plain sight:

| Domain | Real-World Use |
| :--- | :--- |
| **Web engineering** | API rate limiting (Stripe, GitHub, AWS API Gateway all use variants of this) |
| **Cybersecurity** | Throttling login attempts to blunt brute-force and credential-stuffing attacks |
| **Networking** | TCP and router traffic shaping / policing to smooth out bursty packet flows |
| **Distributed systems** | Per-tenant quota enforcement in multi-tenant SaaS platforms |
| **Operating systems** | CPU scheduling quotas (cgroups use a token-bucket-like credit system) |

The deeper lesson: **you don't need to remember every event to control a rate — you only need to remember how much "credit" has accumulated.**

---

## Solution

### The Key Insight: Collapse History into Two Numbers

Instead of logging every request's timestamp (which grows without bound), track only:

1. `tokens` — how many requests you can currently afford.
2. `last_refill` — when you last updated that count.

On every request:

1. Compute elapsed time since `last_refill`.
2. Add `elapsed * rate` tokens, capped at `capacity`.
3. Update `last_refill` to now.
4. If `tokens >= 1`, subtract one and **allow**. Otherwise, **deny**.

No background timer, no per-request storage, no cleanup job. The bucket "catches up" lazily, exactly when it's asked a question.

### Step-by-Step Walkthrough

```
capacity = 5, rate = 1 token/sec, tokens = 5, last_refill = t0

5 requests at t0 → each check refills 0 tokens (no time passed),
                    each consumes 1 token → tokens: 5,4,3,2,1,0

1 request at t0  → refill = 0, tokens still 0 → DENY

... 3 seconds pass ...

request at t3 → elapsed = 3s, refill = 3 * 1 = 3 tokens
                tokens = min(5, 0 + 3) = 3
                consume 1 → tokens = 2 → ALLOW
```

That's it — a rolling, self-updating budget instead of a fixed window.

---

## Code

### Python

```python
import time


class TokenBucket:
    """Allows bursts up to `capacity`, refills at `rate` tokens/second."""

    def __init__(self, capacity, rate, clock=time.monotonic):
        self.capacity = capacity
        self.rate = rate
        self.tokens = capacity
        self.clock = clock
        self.last_refill = clock()

    def _refill(self):
        now = self.clock()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    # A controllable fake clock keeps the demo deterministic
    fake_time = [0.0]
    bucket = TokenBucket(capacity=5, rate=1, clock=lambda: fake_time[0])

    for i in range(1, 6):
        print(f"Request {i} at t=0:", bucket.allow_request())  # True x5

    print("Request 6 at t=0:", bucket.allow_request())  # False, bucket empty

    fake_time[0] = 3.0  # simulate 3 seconds passing
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # False, only 3 tokens refilled
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, rate, clock = () => Date.now() / 1000) {
        this.capacity = capacity;
        this.rate = rate;
        this.tokens = capacity;
        this.clock = clock;
        this.lastRefill = clock();
    }

    _refill() {
        const now = this.clock();
        const elapsed = now - this.lastRefill;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
        this.lastRefill = now;
    }

    allowRequest() {
        this._refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// A controllable fake clock keeps the demo deterministic
let fakeTime = 0;
const bucket = new TokenBucket(5, 1, () => fakeTime);

for (let i = 1; i <= 5; i++) {
    console.log(`Request ${i} at t=0:`, bucket.allowRequest()); // true x5
}

console.log("Request 6 at t=0:", bucket.allowRequest()); // false, bucket empty

fakeTime = 3; // simulate 3 seconds passing
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // true
console.log("Request at t=3:", bucket.allowRequest()); // false, only 3 tokens refilled
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | One subtraction, one multiplication, one comparison — no matter how many requests came before |
| **Space** | O(1) | Just two numbers: `tokens` and `last_refill`, per client |

Compare that to a "sliding window log" limiter, which stores every request's timestamp and needs O(n) memory and O(n) cleanup work per check. The token bucket trades a little precision for a constant, predictable footprint — a trade distributed systems make constantly.

---

## One Minute Insight

> **You rarely need full history to enforce a rule about the future — a well-chosen running total is often enough.** The token bucket doesn't know or care about request #1 through #999,996; it only knows "how much budget is left right now." That's the same trick behind bank account balances, TCP congestion windows, and battery percentage — reduce infinite history to a single, continuously-updated number.

*Run `code.py` or `code.js` to see it in action.*
