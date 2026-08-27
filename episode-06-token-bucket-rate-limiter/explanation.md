# The Bucket That Decides Who Gets In

Every API you've ever called is quietly running a tiny economy of permission slips — and almost nobody notices until they hit `429 Too Many Requests`.

---

## The Problem

Imagine a bucket that holds a maximum of `B` tokens. Tokens drip in at a steady rate `r` per second. Every time a request arrives, it must spend exactly one token to proceed. No tokens left? The request waits or gets rejected.

That's it. That's the entire mental model behind how Stripe, GitHub, AWS, and basically every production API stop a single client from hammering their servers into the ground — while still letting well-behaved bursts of traffic through.

The elegant part: this bucket doesn't need a scheduler, a background thread, or a cron job ticking every millisecond. It computes how full it *should* be, lazily, only when someone actually checks.

---

## Example

```
Bucket capacity: 5 tokens
Refill rate: 1 token/second

t=0.0s  → bucket = 5  → request arrives → allowed  → bucket = 4
t=0.1s  → bucket = 4  → request arrives → allowed  → bucket = 3
t=0.2s  → bucket = 3  → request arrives → allowed  → bucket = 2
t=0.2s  → bucket = 2  → request arrives → allowed  → bucket = 1
t=0.2s  → bucket = 1  → request arrives → allowed  → bucket = 0
t=0.2s  → bucket = 0  → request arrives → DENIED (rate limited)
t=3.2s  → 3 seconds passed → bucket refilled to 3 → request arrives → allowed
```

Five rapid requests burn through the bucket instantly (bursts are fine), then the client is throttled until tokens trickle back in.

---

## Why It Matters

The token bucket shows up everywhere once you know to look for it:

| Domain | Where it lives |
| :--- | :--- |
| **Web engineering** | API gateways rejecting abusive clients with `429` |
| **Cybersecurity** | Throttling login attempts to blunt brute-force and credential-stuffing attacks |
| **Networking** | Traffic shaping on routers (literally where the algorithm originated) |
| **Distributed systems** | Per-tenant quota enforcement in multi-tenant SaaS platforms |
| **Operating systems** | CPU scheduling quotas that let a process burst then get capped |

The deeper idea: **rate limiting isn't about denying access — it's about smoothing bursts into a sustainable average.** A bucket lets you be generous in the short term and strict in the long term, which is exactly what real traffic patterns need.

---

## Solution

### The Key Insight: Don't Simulate Time, Compute It

A naive implementation ticks a timer every second to add a token. That wastes CPU and doesn't scale to millions of independent buckets (one per user, one per API key).

Instead, store just two numbers per bucket: the **current token count** and the **timestamp of the last refill**. When a request arrives:

1. Compute elapsed time since the last check: `elapsed = now - last_refill`.
2. Compute tokens earned during that gap: `elapsed * refill_rate`.
3. Add those tokens to the bucket, capped at capacity.
4. If at least one token is available, subtract one and allow the request. Otherwise, deny it.

No background process. No wasted work while idle. The bucket "catches up" lazily, exactly when it's asked a question.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 1 token/sec
tokens = 5, last_refill = t0

Request at t0 + 0.05s:
  elapsed = 0.05s → earned = 0.05 tokens → tokens = min(5, 5.05) = 5
  tokens >= 1 → allow → tokens = 4

... four more instant requests drain tokens to 0 ...

Request at t0 + 3.2s (bucket was empty since t0 + 0.2s):
  elapsed = 3.0s → earned = 3.0 tokens → tokens = min(5, 0 + 3.0) = 3
  tokens >= 1 → allow → tokens = 2
```

The bucket never "forgets" — it just does the math on demand.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_refill = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self) -> bool:
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests — the 6th should be denied
    for i in range(6):
        print(f"Request {i + 1}: {'allowed' if bucket.allow_request() else 'denied'}")
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastRefill = Date.now();
    }

    #refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;
    }

    allowRequest() {
        this.#refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

const bucket = new TokenBucket(5, 1);

// Burst of 6 requests — the 6th should be denied
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Just arithmetic — no loops, no locks needed for a single bucket |
| **Space** | O(1) per bucket | Two numbers: `tokens` and `last_refill` timestamp |

Scale it to millions of clients and it's still O(1) per bucket, O(n) total space for n clients — no per-second background work required at any scale.

---

## One Minute Insight

> **You don't need to track time continuously to respect it — you just need to measure the gap when it matters.**

The token bucket's trick isn't the bucket itself, it's refusing to do work nobody asked for. Instead of ticking every second for every user (which doesn't scale), it reconstructs history lazily, only at the moment a decision is needed. That same lazy-evaluation instinct — compute on read, not on schedule — quietly makes a huge number of systems, from caches to CRDTs, both correct and cheap.

*Run `code.py` or `code.js` to see it in action.*
