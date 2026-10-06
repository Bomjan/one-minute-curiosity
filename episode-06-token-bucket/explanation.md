# The Bucket That Refills Itself (Without a Timer)

How do APIs let you burst 100 requests, then throttle you, using just **two numbers** and zero background threads?

---

## The Problem

You run an API. You want to allow **short bursts** but cap the **long-run average** — say 1 request/second, with bursts up to 5.

Picture a bucket holding at most 5 tokens. Each request spends one token. Tokens drip back in at 1 per second. Empty bucket? Request denied.

The obvious build: a background thread adding a token every second — for *every user*. A million users means a million timers.

**Your goal:** implement `allow()` with no timers, no threads, and O(1) memory per user.

---

## Example

```
capacity = 5, refill = 1 token/sec

t=0s  : 7 requests  → ✅ ✅ ✅ ✅ ✅ ❌ ❌   (burst of 5, then throttled)
t=2s  : 3 requests  → ✅ ✅ ❌            (2 tokens dripped back in)
```

---

## Why It Matters

The token bucket is the backbone of real rate limiting:

| Domain | Where it shows up |
| :--- | :--- |
| **Web engineering** | API gateways, login throttling, GitHub/Stripe-style limits |
| **Cybersecurity** | Slowing brute-force and credential-stuffing attacks |
| **Networking** | Traffic shaping in routers (the classic origin) |
| **AI** | Per-key request and token budgets for LLM APIs |
| **Distributed systems** | Backpressure so one noisy client can't sink everyone |

---

## Solution

### The Key Insight: Don't Simulate Time — Compute It

Nobody needs the bucket to be *correct between requests*. It only has to be correct **when someone asks**. So store:

1. `tokens` — how many you had at the last visit
2. `last` — when that visit was

On each request, "fast-forward" the drip in one line:

```
tokens = min(capacity, tokens + (now - last) * rate)
```

Then spend a token if you have one.

### Walkthrough

```
capacity=5, rate=1/s, tokens=0 at t=0

t=2s  → tokens = min(5, 0 + 2*1) = 2  → spend 1 → 1 left ✅
t=2s  → tokens = 1                    → spend 1 → 0 left ✅
t=2s  → tokens = 0                    → denied ❌
```

The `min(capacity, …)` is what caps bursts: sleeping for an hour doesn't give you 3600 tokens.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity, refill_per_sec, clock=time.monotonic):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.clock = clock
        self.tokens = float(capacity)
        self.last = clock()

    def allow(self, cost=1):
        # Lazy refill: no timer thread, just do the math when someone knocks.
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillPerSec, clock = () => performance.now() / 1000) {
        this.capacity = capacity;
        this.rate = refillPerSec;
        this.clock = clock;
        this.tokens = capacity;
        this.last = clock();
    }

    allow(cost = 1) {
        // Lazy refill: no timer, just do the math when someone knocks.
        const now = this.clock();
        this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.rate);
        this.last = now;

        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }
}
```

Use a **monotonic** clock — wall-clock time can jump backwards (NTP, DST) and corrupt the math.

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | One multiply, one `min`, one compare |
| **Space** | O(1) per user | Just `tokens` and `last` |

---

## One Minute Insight

> **Lazy beats eager.** If nobody is looking, don't simulate the world — just remember *when* you last looked and compute the difference.

The same trick powers TTL caches, lazy deletion, and copy-on-write. Whenever you reach for a timer, ask: *could a timestamp do this instead?*

*Run `code.py` or `code.js` to see it in action.*
