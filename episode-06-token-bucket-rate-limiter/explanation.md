# The Bucket That Decides If You Get In

Every API you've ever called has a bouncer at the door. It doesn't count your requests one by one — it watches a leaky bucket of tokens and lets you in only while there's water left in it.

---

## The Problem

You're building an API that must survive traffic spikes without falling over, but you also can't just slam the door on every burst — real clients legitimately fire off a handful of requests at once (a page load, a batch sync).

You need a rate limiter that:

1. **Allows short bursts** up to some maximum.
2. **Settles into a steady, sustainable rate** afterward.
3. **Doesn't require a background timer or cron job** ticking constantly.

A naive fixed-window counter ("100 requests per minute, reset on the minute") has a nasty flaw: a client can fire 100 requests at `0:59` and another 100 at `1:00` — 200 requests in two seconds, technically "within limits."

---

## Example

```
Bucket: capacity = 5 tokens, refill rate = 1 token/sec

t=0.0s  → 5 requests fire instantly → all allowed (bucket: 5 → 0)
t=0.1s  → 1 more request           → blocked (bucket empty)
t=1.1s  → 1 token refilled         → allowed (bucket: 1 → 0)
```

Burst of 5 absorbed immediately, then throttled to ~1 request/sec — no timers, no counters resetting on a clock edge.

---

## Why It Matters

The token bucket (and its cousin, the leaky bucket) is the default rate-limiting algorithm behind:

| Domain | Real-World Use |
| :--- | :--- |
| **Web engineering** | API gateways (AWS, Stripe, GitHub) throttling per API key |
| **Networking** | Traffic shaping on routers (literally where the algorithm originated) |
| **Distributed systems** | Backpressure between microservices to prevent cascading overload |
| **Cybersecurity** | Slowing brute-force login attempts without locking out real users |
| **Operating systems** | CPU scheduling quotas — bursty processes get a budget, not a hard wall |

The deeper lesson: **good limits aren't binary gates — they're budgets that refill.**

---

## Solution

### The Key Insight: Don't Track Requests, Track Time

Instead of storing a timestamp per request (expensive, grows unbounded), store just two numbers:

* `tokens` — how much "budget" is currently available
* `last_check` — when you last looked

On every request, compute how much time has passed, refill proportionally (capped at `capacity`), then spend a token if you can afford it. The bucket "fills itself" lazily — no background thread required.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 1 token/sec, tokens = 5

Request arrives → refill (no time passed, tokens stay 5)
                 → tokens >= 1? yes → spend 1 → tokens = 4 → ALLOW

... 4 more instantly → tokens drains to 0 → ALLOW x4

Next request, 0 seconds later → tokens = 0 → BLOCK

Request 1.1s later → elapsed = 1.1s → refill 1.1 tokens (capped at 5)
                    → tokens = 1.1 → spend 1 → tokens = 0.1 → ALLOW
```

Each check is O(1) — just arithmetic, no loops, no stored history.

---

## Code

### Python

```python
import time


class TokenBucket:
    """Allows bursts up to `capacity`, then throttles to a steady `refill_rate` tokens/sec."""

    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_check = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_check = now

    def allow(self, cost: float = 1) -> bool:
        self._refill()
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    # 5 token capacity, refilling at 1 token/sec — like a 5-request burst, then 1 req/sec.
    bucket = TokenBucket(capacity=5, refill_rate=1)

    for i in range(7):
        print(f"request {i + 1}: {'allowed' if bucket.allow() else 'blocked'}")
```

### JavaScript

```javascript
class TokenBucket {
  // Allows bursts up to `capacity`, then throttles to a steady `refillRate` tokens/sec.
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastCheck = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastCheck) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRate);
    this.lastCheck = now;
  }

  allow(cost = 1) {
    this._refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

// 5 token capacity, refilling at 1 token/sec — like a 5-request burst, then 1 req/sec.
const bucket = new TokenBucket(5, 1);

for (let i = 0; i < 7; i++) {
  console.log(`request ${i + 1}: ${bucket.allow() ? "allowed" : "blocked"}`);
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Just a subtraction and a comparison — no loops, no history scan |
| **Space** | O(1) per bucket | Two numbers (`tokens`, `last_check`) regardless of traffic volume |

Compare this to a sliding-window log limiter, which needs O(n) space per client to store every request timestamp. The token bucket trades a tiny bit of precision for constant memory — a deal that scales to millions of clients.

---

## One Minute Insight

> **Rate limiting isn't about counting the past — it's about budgeting the present.** A bucket that refills over time absorbs bursts gracefully while still enforcing a hard long-run average, with O(1) memory per client. The same "budget that regenerates" pattern shows up in CPU scheduling, network traffic shaping, and even biological systems (think: energy reserves) — whenever you need to allow short-term flexibility without sacrificing long-term limits.

*Run `code.py` or `code.js` to see it in action.*
