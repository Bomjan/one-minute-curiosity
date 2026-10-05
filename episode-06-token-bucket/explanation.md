# The Bucket That Fills Itself

How do APIs say "slow down" without running a timer for every user? They keep a bucket of tokens that refills *only when you look at it*.

---

## The Problem

You run an API. Each user may make **5 requests in a burst**, but only **1 request per second** on average. Anything faster gets a `429 Too Many Requests`.

Think of a coffee shop punch card: it holds at most 5 punches, and a new one appears every second. Each order costs one punch. Empty card? Wait.

The catch: you have a million users. You can't run a million timers. How do you refill buckets for free?

---

## Example

```
capacity = 5, refill = 1 token/sec

t=0    7 requests at once  → ✅ ✅ ✅ ✅ ✅ ❌ ❌
t=1    1 request           → ✅  (one token trickled back)
t=1    1 request           → ❌
t=100  1 request           → ✅  (bucket refilled, but capped at 5)
```

---

## Why It Matters

The token bucket is behind most real-world throttling:

| Domain | Where it shows up |
| :--- | :--- |
| **Web APIs** | Per-key rate limits (Stripe, GitHub, cloud gateways) |
| **Networking** | Traffic shaping in routers and Linux `tc` |
| **Cybersecurity** | Slowing brute-force logins and credential stuffing |
| **AI services** | Requests- and tokens-per-minute quotas for LLM APIs |
| **Distributed systems** | Protecting a backend from retry storms |

---

## Solution

### The Key Insight: Don't Refill. Calculate.

Nobody needs to drop tokens into the bucket every second. Store just two numbers: the **token count** and the **last time you checked**. When a request arrives:

1. `elapsed = now - last`
2. `tokens = min(capacity, tokens + elapsed * rate)`
3. If `tokens >= cost`, spend them and allow. Otherwise reject.

The refill is *lazy*: time passing is simply arithmetic. Per user you store two numbers, which makes it easy to keep in Redis.

The `min(capacity, ...)` is what allows bursts but stops a user from "saving up" a week of idle time.

### Walkthrough

```
t=0:   tokens=5 → spend 5 → 0. Requests 6 and 7 are rejected.
t=1:   elapsed=1 → tokens=0+1=1 → spend → 0 ✅
t=1:   elapsed=0 → tokens=0 → ❌
t=100: elapsed=99 → min(5, 99) = 5 → spend → 4 ✅
```

---

## Code

### Python

```python
class TokenBucket:
    def __init__(self, capacity, refill_per_sec, now=0.0):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.tokens = capacity
        self.last = now

    def allow(self, now, cost=1):
        # Lazy refill: no timer, just do the math when someone knocks
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now

        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_per_sec=1)

    burst = [bucket.allow(now=0) for _ in range(7)]
    print(burst)  # [True, True, True, True, True, False, False]

    print(bucket.allow(now=1))  # True  (1 token refilled)
    print(bucket.allow(now=1))  # False
    print(bucket.allow(now=100))  # True  (refill is capped at capacity)
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillPerSec, now = 0) {
        this.capacity = capacity;
        this.rate = refillPerSec;
        this.tokens = capacity;
        this.last = now;
    }

    allow(now, cost = 1) {
        // Lazy refill: no timer, just do the math when someone knocks
        const elapsed = now - this.last;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
        this.last = now;

        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }
}

const bucket = new TokenBucket(5, 1);

console.log(Array.from({ length: 7 }, () => bucket.allow(0))); // 5 true, 2 false
console.log(bucket.allow(1));   // true  (1 token refilled)
console.log(bucket.allow(1));   // false
console.log(bucket.allow(100)); // true  (refill is capped at capacity)
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | A subtraction, a multiply, a min |
| **Space** | O(1) per user | Two numbers: `tokens` and `last` |

---

## One Minute Insight

> **Don't simulate time, compute it.** Any "every N seconds" process that only matters when observed can be replaced by a formula evaluated on demand.

Lazy evaluation turns a million timers into a million tiny structs. In production, pass in a monotonic clock (not wall-clock time) and make the read-modify-write atomic (e.g. a Redis Lua script) so concurrent requests can't spend the same token twice.

*Run `code.py` or `code.js` to see it in action.*
