# The Bucket That Says "Slow Down"

Every API you've ever hit has a bouncer at the door. It doesn't ban you — it just hands out tickets at a fixed rate, and once they run out, you wait. That bouncer is an algorithm, and it's called the Token Bucket.

---

## The Problem

You're building an API that must survive traffic spikes without falling over, but you also don't want to punish a client for one quick burst of requests.

**The constraint:** allow up to `capacity` requests to fire instantly (a burst), but over time, never let the average rate exceed `r` requests per second.

A naive fixed-window counter ("max 100 requests per minute") has a nasty edge case: a client can send 100 requests in the last second of one window and another 100 in the first second of the next — 200 requests in two seconds, technically "within limits."

**Your goal:** design a rate limiter that smooths this out, allows bursts up to a cap, and refills predictably — using **O(1) memory per client**.

---

## Example

```
Bucket: capacity = 5 tokens, refill rate = 1 token/sec

t=0.0s  bucket = 5  → request → ALLOWED  (bucket = 4)
t=0.1s  bucket = 4  → request → ALLOWED  (bucket = 3)
t=0.1s  bucket = 3  → request → ALLOWED  (bucket = 2)
t=0.1s  bucket = 2  → request → ALLOWED  (bucket = 1)
t=0.1s  bucket = 1  → request → ALLOWED  (bucket = 0)
t=0.1s  bucket = 0  → request → DENIED   (no tokens left)

t=3.1s  refill adds 3 tokens (3 seconds * 1/sec) → bucket = 3
        request → ALLOWED (bucket = 2)
```

The burst of 5 instant requests succeeds, but the client can't sustain that pace — it must wait for tokens to regenerate.

---

## Why It Matters

Token bucket (and its cousin, leaky bucket) is the quiet workhorse behind:

| Domain | Real-World Analogy |
| :--- | :--- |
| **API gateways** | Stripe, GitHub, and AWS all rate-limit clients this way |
| **Networking** | Traffic shaping on routers — smoothing bursty packet flows |
| **Distributed systems** | Backpressure between microservices to prevent cascading overload |
| **Cybersecurity** | Throttling login attempts to slow brute-force attacks without locking out real users |
| **Cloud billing** | "Burstable" CPU credits on AWS/GCP instances work on the exact same model |

The deeper lesson: **rate limiting isn't about counting requests, it's about modeling capacity over time.**

---

## Solution

### The Key Insight: Time Itself Is the Refill Mechanism

Instead of storing every request timestamp (expensive) or resetting a counter on a clock boundary (bursty at the edges), store just two numbers per client:

1. `tokens` — how many requests are currently available
2. `last_refill_time` — when we last topped up the bucket

On every request:
1. Compute elapsed time since `last_refill_time`.
2. Add `elapsed * refill_rate` tokens (capped at `capacity`).
3. If `tokens >= 1`, consume one and allow the request. Otherwise, deny it.

No background thread, no scheduled jobs — refilling happens lazily, exactly when needed.

### Step-by-Step Walkthrough

```
capacity = 5, rate = 1 token/sec, bucket starts full (5)

5 requests arrive instantly → all allowed, bucket drains to 0
3 seconds pass with no requests
Next request arrives:
  elapsed = 3s
  refill = 3s * 1/sec = 3 tokens
  bucket = min(5, 0 + 3) = 3
  consume 1 → bucket = 2, request ALLOWED
```

Each client gets its own bucket, so the whole limiter is just a hashmap of `client_id → (tokens, last_refill_time)` — constant space per client, constant time per check.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity        # max tokens (burst size)
        self.refill_rate = refill_rate  # tokens added per second
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests: 5 should pass, the 6th should be denied
    for i in range(6):
        print(f"Request {i + 1}: {'ALLOWED' if bucket.allow_request() else 'DENIED'}")

    time.sleep(3)
    print("After 3s wait:", "ALLOWED" if bucket.allow_request() else "DENIED")
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;       // max tokens (burst size)
        this.refillRate = refillRate;   // tokens added per second
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    _refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
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

const bucket = new TokenBucket(5, 1);

// Burst of 6 requests: 5 should pass, the 6th should be denied
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}:`, bucket.allowRequest() ? "ALLOWED" : "DENIED");
}

setTimeout(() => {
    console.log("After 3s wait:", bucket.allowRequest() ? "ALLOWED" : "DENIED");
}, 3000);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Just a subtraction, a multiplication, and a comparison |
| **Space** | O(1) per client | Only `tokens` and `last_refill` need to be stored |

Compare this to logging every request timestamp (sliding window log), which costs O(n) space per client where `n` is the number of requests in the window. Token bucket gets the same smoothing behavior for a constant memory footprint.

---

## One Minute Insight

> **You don't need history to enforce a rate — you need a clock and a cap.** The token bucket replaces "remember everything that happened" with "compute how much could have happened since I last checked." That single reframe is what makes rate limiting cheap enough to run on every request, for every client, at internet scale.

*Run `code.py` or `code.js` to see it in action.*
