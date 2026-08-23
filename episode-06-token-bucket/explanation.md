# The Bucket That Never Overflows

Every API you've ever hammered with retries had a bouncer at the door. Here's the algorithm behind "please try again later" — and why it's smarter than it looks.

---

## The Problem

Imagine a bucket that holds at most `capacity` tokens. Every request needs **one token** to get through. If the bucket is empty, the request is rejected.

Here's the twist: the bucket **refills itself** at a steady rate — say, 5 tokens per second — but never overflows past `capacity`.

This lets a client burst (spend all its saved-up tokens at once) but never sustain a rate faster than the refill speed.

**Your goal:** design a check, `allow_request()`, that decides in **O(1) time** whether a request should pass — without running a background timer, and without storing a full history of past requests.

---

## Example

```
capacity = 5 tokens, refill rate = 1 token/second

t=0.0s  bucket=5  → request → ALLOW (bucket=4)
t=0.1s  bucket=4  → request → ALLOW (bucket=3)
t=0.1s  bucket=3  → request → ALLOW (bucket=2)
t=0.1s  bucket=2  → request → ALLOW (bucket=1)
t=0.1s  bucket=1  → request → ALLOW (bucket=0)
t=0.1s  bucket=0  → request → DENY  (no tokens left)
t=3.0s  bucket refills to min(5, 0 + 2.9*1) ≈ 2.9 → request → ALLOW (bucket≈1.9)
```

The client burned its whole burst in 0.5 seconds, got throttled, then earned tokens back just by waiting.

---

## Why It Matters

| Domain | Real-World Analogy |
| :--- | :--- |
| **Web engineering** | Protecting an API endpoint from being hammered by a buggy client or script |
| **Cybersecurity** | Slowing brute-force login attempts without blocking legitimate users outright |
| **Networking** | Traffic shaping on routers — smoothing bursty packets into a steady flow |
| **Distributed systems** | Per-tenant quotas in a multi-tenant service, enforced independently per client |
| **Databases** | Throttling expensive queries so one noisy client can't starve the connection pool |

The deeper lesson: **you don't need a timer or a queue to rate-limit something — you need lazy math.**

---

## Solution

### The Key Insight: Don't Track Time, Just Compute It

A naive implementation runs a background job that adds a token every `1/rate` seconds. That's wasteful — you're paying CPU cycles even when nobody's making requests.

The trick: **only recompute the bucket's state when someone actually asks.** Store just two numbers — the last known token count and the last update timestamp. On each request:

1. Compute elapsed time since the last check.
2. Add `elapsed * rate` tokens, capped at `capacity`.
3. If at least one token is available, consume it and allow. Otherwise, deny.

No timers. No queues. No history. Just arithmetic, done lazily, on demand.

### Step-by-Step Walkthrough

```
State: tokens=5.0, last_check=t0, capacity=5, rate=1/sec

Request at t0 + 0.5s:
  elapsed = 0.5s
  tokens = min(5, 5.0 + 0.5*1) = 5.0  (already full, capped)
  tokens >= 1? yes → tokens -= 1 → tokens = 4.0 → ALLOW

... 5 rapid requests later, tokens = 0.0, last_check = t0 + 0.5s

Request at t0 + 0.6s:
  elapsed = 0.1s
  tokens = min(5, 0.0 + 0.1*1) = 0.1
  tokens >= 1? no → DENY (bucket stays at 0.1)

Request at t0 + 3.5s:
  elapsed = 3.0s (measured from last_check at 0.5s)
  tokens = min(5, 0.1 + 3.0*1) = 3.1
  tokens >= 1? yes → tokens -= 1 → tokens = 2.1 → ALLOW
```

Every check is a constant handful of operations — regardless of how many requests came before.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_check = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.last_check = now

        # Lazily refill based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 burst, 1/sec sustained

    for i in range(7):
        print(f"request {i}: {'ALLOW' if bucket.allow_request() else 'DENY'}")
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastCheck = performance.now() / 1000;
    }

    allowRequest() {
        const now = performance.now() / 1000;
        const elapsed = now - this.lastCheck;
        this.lastCheck = now;

        // Lazily refill based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

const bucket = new TokenBucket(5, 1); // 5 burst, 1/sec sustained

for (let i = 0; i < 7; i++) {
    console.log(`request ${i}: ${bucket.allowRequest() ? "ALLOW" : "DENY"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per check | Just a subtraction, a multiply, and a comparison — no loops, no timers |
| **Space** | O(1) per bucket | Two numbers (`tokens`, `last_check`) regardless of request volume |

Compare that to logging every request timestamp and counting how many fall in a sliding window — that's O(n) space per client and gets expensive fast at scale.

---

## One Minute Insight

> **State doesn't need to be updated continuously to be accurate — it just needs to be recomputed correctly when observed.** The token bucket never "ticks" in the background; it simply asks "how much time has passed?" the moment someone shows up and does the math right then.

This is the same trick behind lazy evaluation, TTL-based cache expiry, and physics engines that integrate position from elapsed time instead of polling every frame. Don't track change — compute it on demand.

*Run `code.py` or `code.js` to see it in action.*
