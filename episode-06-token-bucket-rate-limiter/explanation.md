# The Bouncer Who Hands Out Tickets

Imagine a nightclub bouncer with a small bucket of entry tickets. Every second, he drops a few new tickets into the bucket — but the bucket can only hold so many. Anyone who wants in must grab a ticket. No ticket, no entry. This tiny mental model is the secret behind how APIs survive being hammered by millions of requests.

---

## The Problem

You're building an API gateway. Clients can call your endpoint, but if even one client fires 10,000 requests per second, it can take down your whole system.

You need a **rate limiter** that:

1. Allows a steady, predictable average rate of requests.
2. Still tolerates short **bursts** of traffic (real users aren't perfectly smooth).
3. Uses **O(1)** memory per client — no storing timestamps of every request.

This is the classic **Token Bucket** algorithm.

---

## Example

```
Bucket capacity = 5 tokens
Refill rate     = 1 token / second

t=0s: bucket = 5  → request arrives → ALLOWED (bucket = 4)
t=0s: 4 more requests instantly → ALLOWED (bucket = 0)
t=0s: 1 more request → REJECTED (bucket empty)
t=3s: bucket refilled to 3 (3 seconds × 1 token/sec)
t=3s: request arrives → ALLOWED (bucket = 2)
```

The bucket lets a burst of 5 through immediately, then throttles to a steady 1/sec.

---

## Why It Matters

Rate limiting is everywhere once you start looking:

| Domain | Use Case |
| :--- | :--- |
| **Web APIs** | Stripe, GitHub, and Twitter all cap requests per user/key |
| **Networking** | Routers shape traffic using token-bucket-based QoS |
| **Cybersecurity** | Throttling login attempts to slow brute-force attacks |
| **Distributed systems** | Preventing a noisy client from starving shared resources |
| **Databases** | Limiting expensive query rates per tenant |

The token bucket is popular because it's **cheap** (a counter and a timestamp), **fair** (steady average rate), and **realistic** (bursts are allowed, unlike rigid fixed windows).

---

## Solution

### The Key Insight: Don't Track Requests — Track Tokens

A naive rate limiter stores a timestamp for every request and counts how many fall in the last second — that's **O(n)** memory and gets messy fast.

Instead, the token bucket tracks just **two numbers**:

- `tokens`: how many requests you can currently make
- `last_refill_time`: when you last topped up the bucket

### Step-by-Step Walkthrough

1. On every request, calculate how much time has passed since the last refill.
2. Add `elapsed_time × refill_rate` tokens to the bucket (capped at max capacity).
3. If `tokens >= 1`, subtract 1 and **allow** the request.
4. Otherwise, **reject** it.

That's it — no loops, no stored history, just arithmetic.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity        # max tokens the bucket can hold
        self.refill_rate = refill_rate  # tokens added per second
        self.tokens = capacity          # start full
        self.last_refill = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_refill

        # Refill based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    limiter = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests at once
    for i in range(6):
        print(f"Request {i + 1}: {'ALLOWED' if limiter.allow_request() else 'REJECTED'}")
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

    allowRequest() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;

        // Refill based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// Burst of 6 requests at once
const limiter = new TokenBucket(5, 1);
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${limiter.allowRequest() ? "ALLOWED" : "REJECTED"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) | Each request does a constant number of arithmetic operations |
| **Space** | O(1) per client | Only two numbers (`tokens`, `last_refill`) need to be stored |

Compare that to a sliding-window log approach, which needs **O(n)** memory per client to store every request timestamp.

---

## One Minute Insight

> **You don't need history to enforce a rate — you need a clock and a counter.** The token bucket compresses an entire stream of past requests into two numbers, refreshed lazily on demand. It's the same trick behind leaky buckets, CPU credit systems (AWS burstable instances), and even how your phone throttles background app refreshes. When state grows with time, look for a formula that replaces the log.
