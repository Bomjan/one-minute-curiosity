# The Bucket That Decides Who Gets to Speak

Every API has a bouncer. Too many requests, too fast, and the bouncer cuts you off — but the best bouncers don't just count, they let you save up "credit" for bursts. That's the Token Bucket algorithm, and it's running behind almost every rate limiter you've ever hit a 429 from.

---

## The Problem

You're building an API that must enforce: **"a client can make at most R requests per second, on average, but may briefly burst above that if they've been idle."**

A naive fixed-window counter ("max 100 requests per second, reset every second") has a flaw: a client can send 100 requests in the last millisecond of one window and another 100 in the first millisecond of the next — 200 requests in 2ms, despite the "limit."

You need a rate limiter that:
1. Allows smooth, sustained throughput at rate `R`.
2. Allows short bursts up to a `capacity` if the client has been quiet.
3. Uses **O(1)** memory per client — no sliding history of timestamps.

---

## Example

```
Bucket: capacity = 5 tokens, refill rate = 1 token/second

t=0s   bucket = 5 (full, idle before this)
t=0s   request → allowed, bucket = 4
t=0s   request → allowed, bucket = 3
t=0s   request x3 → allowed, bucket = 0
t=0s   request → DENIED (bucket empty)

t=3s   bucket refilled to 3 (3 seconds * 1 token/s)
t=3s   request → allowed, bucket = 2
```

The client burned through 5 requests instantly (the burst), then had to wait for tokens to regenerate before sending more — exactly the behavior we wanted.

---

## Why It Matters

Token bucket (and its cousin, leaky bucket) shows up everywhere traffic needs shaping, not just blocking:

| Domain | Real-World Use |
| :--- | :--- |
| **Web APIs** | Stripe, GitHub, and AWS all rate-limit with token-bucket variants |
| **Networking** | Traffic shaping and QoS on routers use literal token buckets |
| **Distributed systems** | Throttling requests between microservices to prevent cascading overload |
| **Cybersecurity** | Slowing brute-force login attempts without fully blocking legitimate bursts |
| **Databases** | Limiting expensive query rates per tenant in multi-tenant systems |

The deeper lesson: **rate limiting isn't about counting requests — it's about modeling capacity as a resource that regenerates over time.**

---

## Solution

### The Key Insight: Don't Track Requests, Track Time

Instead of storing a timestamp for every request (which grows with traffic), store just two numbers per client:
- `tokens`: how many requests they can make right now
- `last_refill_time`: when we last topped up the bucket

On every request:
1. Compute elapsed time since `last_refill_time`.
2. Add `elapsed * refill_rate` tokens (capped at `capacity`).
3. If `tokens >= 1`, consume one and allow the request. Otherwise, deny it.

This is **lazy refilling** — you never need a background timer ticking every millisecond. The math reconstructs how many tokens *would* have accumulated, on demand.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 1 token/sec
tokens = 5, last_refill = t0

Request at t0:      elapsed=0   → tokens stays 5  → consume 1 → tokens=4 ✓
Request at t0:      elapsed=0   → tokens stays 4  → consume 1 → tokens=3 ✓
... (3 more instantly) → tokens = 0
Request at t0:      tokens=0    → DENIED ✗

Request at t0+3.5s:  elapsed=3.5 → refill 3.5 tokens (capped at 5) → tokens=3.5
                     → consume 1 → tokens=2.5 ✓ → allowed
```

No history list, no cleanup job — just two numbers updated in constant time.

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

        # Lazily top up tokens based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests instantly: first 5 allowed, 6th denied
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

    allowRequest() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;

        // Lazily top up tokens based on elapsed time, capped at capacity
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

// Burst of 6 requests instantly: first 5 allowed, 6th denied
const bucket = new TokenBucket(5, 1);
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | One subtraction, one multiplication, one comparison — no loops |
| **Space** | O(1) per client | Just two numbers (`tokens`, `last_refill`), regardless of traffic volume |

Compare that to a sliding-window log limiter, which stores every request timestamp and costs O(n) memory per client. Token bucket gets the same smoothing behavior with constant memory by trading stored history for a bit of arithmetic.

---

## One Minute Insight

> **You don't need to remember the past to enforce a rule about it — sometimes you just need to know how much time has passed.** Token bucket replaces a growing list of timestamps with two numbers and a formula, turning an O(n) bookkeeping problem into O(1) math. That's the same trick behind exponential backoff, TTL caches, and physics simulations: model state as a function of elapsed time, not a log of events.

*Run `code.py` or `code.js` to watch a burst get smoothed out in real time.*
