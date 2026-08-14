# How APIs Say "Slow Down" Without Saying a Word

Every time you hit an API too fast and get a `429 Too Many Requests`, a tiny bucket of imaginary coins just ran dry. Here's the elegant trick behind it.

---

## The Problem

You're building an API, and you need to stop any single client from hammering it thousands of times a second — while still letting well-behaved clients burst a little when they need to (like loading a dashboard that fires 5 requests at once).

A naive counter ("max 100 requests per minute, reset every 60s") is unfair: a client can blow through its entire minute's quota in the first second, then sit idle, then blow through the next minute's quota instantly too — 200 requests in 2 seconds, technically "compliant."

You need a rate limiter that:
1. Allows short bursts up to some ceiling.
2. Smoothly throttles sustained traffic to a steady average rate.
3. Needs **no background timer or cron job** — it should just work when checked.

---

## Example

```
capacity = 5 tokens, refill_rate = 1 token/sec
Bucket starts full: 5 tokens

Request 1 → allowed (4 tokens left)
Request 2 → allowed (3 tokens left)
Request 3 → allowed (2 tokens left)
Request 4 → allowed (1 token left)
Request 5 → allowed (0 tokens left)
Request 6 → REJECTED (bucket empty)
Request 7 → REJECTED (still refilling)

... wait 3 seconds (3 tokens refill) ...

Request 8 → allowed (2 tokens left)
```

The first 5 requests burst through instantly (that's the "burst capacity"). After that, you're capped at roughly 1 request per second — the sustained rate.

---

## Why It Matters

Rate limiting via token bucket is everywhere once you know to look for it:

| Domain | Real-World Use |
| :--- | :--- |
| **Web APIs** | Stripe, GitHub, and AWS all rate-limit clients this way |
| **Networking** | Traffic shaping and QoS on routers uses the same "leaky/token bucket" math |
| **Cybersecurity** | Throttling login attempts to blunt brute-force attacks without locking out real users |
| **Distributed systems** | Backpressure between services — a downstream service protects itself by handing out "permits" |
| **Cloud billing** | AWS Lambda concurrency, Kubernetes CPU throttling — all bucket-shaped |

The core idea — **allow bursts, but cap the long-run average** — is the same lever used to keep any shared resource fair without a central scheduler.

---

## Solution

### The Insight: Time *is* the refill mechanism

Instead of running a timer that adds tokens every tick, notice that **tokens accumulated is just a function of elapsed time**. You don't need to update the bucket in the background — you only need to know *how long it's been* since you last checked, and multiply that by your refill rate.

### The Algorithm

1. Track `tokens` (current balance) and `last_check` (timestamp of the last update).
2. On each request:
   - Compute `elapsed = now - last_check`.
   - Add `elapsed * refill_rate` tokens, capped at `capacity`.
   - Update `last_check = now`.
   - If `tokens >= 1`, subtract 1 and allow the request. Otherwise, reject it.

That's it — no background thread, no cron job, no wasted work when nobody's making requests. The bucket "catches up" lazily, exactly when someone asks.

---

## Code

### Python

```python
import time


class TokenBucket:
    """A bucket that refills with tokens over time and spends them on requests."""

    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold (burst size)
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_check = time.monotonic()

    def allow_request(self, tokens_needed=1):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.last_check = now

        # Refill based on time passed, never exceeding capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= tokens_needed:
            self.tokens -= tokens_needed
            return True
        return False


if __name__ == "__main__":
    # Allows bursts of up to 5 requests, then throttles to 1 request/sec
    bucket = TokenBucket(capacity=5, refill_rate=1)

    for i in range(7):
        allowed = bucket.allow_request()
        print(f"Request {i + 1}: {'allowed' if allowed else 'rejected'}")
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens the bucket can hold (burst size)
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;         // start full
        this.lastCheck = Date.now();
    }

    allowRequest(tokensNeeded = 1) {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastCheck) / 1000;
        this.lastCheck = now;

        // Refill based on time passed, never exceeding capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);

        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
}

// Allows bursts of up to 5 requests, then throttles to 1 request/sec
const bucket = new TokenBucket(5, 1);

for (let i = 0; i < 7; i++) {
    const allowed = bucket.allowRequest();
    console.log(`Request ${i + 1}: ${allowed ? "allowed" : "rejected"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Just arithmetic on two numbers — no loops, no scans |
| **Space** | O(1) per client | Only `tokens` and `last_check` need to be stored |

Compare that to a sliding-window log rate limiter, which stores a timestamp per request and costs O(n) space and time per check — the token bucket compresses an entire request history into two numbers.

---

## One Minute Insight

> **You don't need to track history to enforce a rate — you just need to track state and elapsed time.** The token bucket replaces "remember everything that happened" with "remember one number and do the math lazily." That's the same trick behind exponential backoff, TCP congestion windows, and battery-level estimators: let time do the bookkeeping for you.
