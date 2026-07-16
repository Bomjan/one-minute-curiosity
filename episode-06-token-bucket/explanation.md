# The Bucket That Controls the Internet

Every API you've ever hit "429 Too Many Requests" on was protected by a bucket of imaginary tokens — and the algorithm behind it is beautifully simple.

---

## The Problem

Imagine a water bucket that holds a fixed number of tokens. Every time a request comes in, it must take one token to proceed. If the bucket is empty, the request is rejected (or made to wait).

The bucket isn't refilled by someone watching a clock — it refills itself gradually, at a steady rate, up to its maximum capacity.

**The goal:** allow short bursts of traffic (up to the bucket's size), while capping the *long-run average* rate of requests — all without running a background timer or scheduler.

This is the **Token Bucket algorithm**, and it's how GitHub, Stripe, AWS, and nearly every public API throttle traffic without grinding to a halt under load.

---

## Example

```
Bucket: capacity = 5 tokens, refill rate = 0.5 tokens/sec (1 every 2s)

7 requests arrive back-to-back at t = 0s:

Request 1: allowed   (tokens: 5 -> 4)
Request 2: allowed   (tokens: 4 -> 3)
Request 3: allowed   (tokens: 3 -> 2)
Request 4: allowed   (tokens: 2 -> 1)
Request 5: allowed   (tokens: 1 -> 0)
Request 6: denied    (0 tokens, no time has passed to refill)
Request 7: denied    (still 0 tokens)

Wait 2 seconds -> bucket refills 1 token -> next request is allowed again.
```

---

## Why It Matters

The token bucket pattern shows up everywhere systems need to balance fairness against burstiness:

| Domain | Real-World Use |
| :--- | :--- |
| **Web engineering** | API rate limiting (requests per user/IP per minute) |
| **Networking** | Traffic shaping and QoS on routers |
| **Cybersecurity** | Throttling login attempts to blunt brute-force and credential-stuffing attacks |
| **Distributed systems** | Backpressure between microservices to prevent cascading overload |
| **AI infrastructure** | Throttling inference requests per API key to protect GPU capacity |

The deeper lesson: **you don't need a scheduler to enforce a rate — you just need to know how much time has passed.**

---

## Solution

### The Key Insight: Refill Lazily, Not on a Timer

A naive implementation spins up a background thread that adds a token every `1/rate` seconds. That wastes CPU and doesn't scale to millions of buckets (one per user, for example).

The elegant trick: **don't refill until someone asks.** Store only two numbers — the current token count and the timestamp of the last refill. When a request arrives:

1. Compute `elapsed = now - last_refill_time`.
2. Add `elapsed * refill_rate` tokens, capped at `capacity`.
3. If at least 1 token is available, consume it and allow the request. Otherwise, deny it.

No timers, no threads, no wasted work while nobody's asking — the bucket "catches up" instantly the moment it's checked.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 0.5 tokens/sec, tokens = 5, last_refill = t0

t0:      request arrives, elapsed = 0s -> tokens stays 5 -> consume -> tokens = 4
t0:      4 more requests arrive instantly -> tokens drains to 0
t0 + 2s: request arrives, elapsed = 2s -> refill 2 * 0.5 = 1 token -> tokens = 1
         -> consume -> tokens = 0
```

Each check is a handful of arithmetic operations — independent of how much real time has passed or how many other buckets exist.

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
        self.last_refill = time.time()

    def _refill(self):
        # Lazy refill: only compute how many tokens accumulated
        # since the last check. No background timer needed.
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


# 5 tokens max, refilling 1 token every 2 seconds
bucket = TokenBucket(capacity=5, refill_rate=0.5)

for i in range(1, 8):
    print(f"Request {i}: {'allowed' if bucket.allow_request() else 'denied'}")
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

// 5 tokens max, refilling 1 token every 2 seconds
const bucket = new TokenBucket(5, 0.5);

for (let i = 1; i <= 7; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "allowed" : "denied"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Just a subtraction, multiplication, and comparison — no loops, no timers |
| **Space** | O(1) per bucket | Only two numbers stored: `tokens` and `last_refill` |

Compare that to a naive "sliding window" rate limiter that logs every request timestamp: O(n) space per user and O(n) work to prune old entries. The token bucket collapses all of that history into two numbers, without losing accuracy.

---

## One Minute Insight

> **You don't need to track time — you need to track the *difference* in time.** The token bucket never "ticks." It just measures the gap between now and the last time anyone looked, and lets math do the refilling.

This same trick — replacing continuous background work with a lazy, on-demand recomputation — is why so many systems (caches, physics engines, animation frameworks) stay fast at scale: do nothing until someone's actually watching.

*Run `code.py` or `code.js` to see it in action.*
