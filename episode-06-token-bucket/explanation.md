# The Rate Limiter With No Timer

A bucket that "refills" every second — without a single background thread ticking away.

---

## The Problem

Your API is a nightclub with a bouncer. Regular guests get in at a steady pace, but a group of friends arriving together shouldn't be turned away instantly either.

Design a **rate limiter** that:

1. Allows short **bursts** (up to `capacity` requests at once).
2. Enforces a steady **average rate** (`rate` requests per second).
3. Answers `allow()` in constant time, using constant memory per user.

The trap: a naive "refill the bucket every second with a timer" design needs a thread per user. Millions of users means millions of timers.

---

## Example

```
capacity = 3, rate = 1 token/sec

t=0    -> ALLOW   (3 tokens -> 2)
t=0    -> ALLOW   (2 -> 1)
t=0    -> ALLOW   (1 -> 0)
t=0    -> DENY    (empty)
t=0.5  -> DENY    (0.5 tokens, need 1)
t=1    -> ALLOW   (1 token refilled)
t=2    -> ALLOW
t=2.1  -> DENY
```

---

## Why It Matters

This is the **token bucket**, the algorithm behind API gateways, cloud provider throttling, and network traffic shaping. It protects services from abuse and cascading overload, and it powers login-attempt limits in cybersecurity. Understanding it is a system design interview staple.

---

## Solution

The insight: **you don't need to refill the bucket, you only need to know how much it *would* have refilled.**

1. Store just two numbers: `tokens` and the `last` timestamp.
2. On each request, compute `elapsed * rate` and add it, capped at `capacity`.
3. If `tokens >= cost`, spend them and allow. Otherwise deny.

The refill is *lazy*: time passing costs nothing until someone asks.

Passing `now` in explicitly (instead of reading the clock inside) makes the limiter deterministic and trivially testable.

---

## Code

See [`code.py`](./code.py) and [`code.js`](./code.js).

```python
def allow(self, now, cost=1):
    elapsed = now - self.last
    self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
    self.last = now
    if self.tokens >= cost:
        self.tokens -= cost
        return True
    return False
```

---

## Complexity

- **Time:** O(1) per request.
- **Space:** O(1) per user (two numbers). In a distributed setup, store them in Redis and update atomically with a Lua script.

---

## One Minute Insight

> The cheapest way to model the passage of time is to not model it at all — just do the subtraction when someone asks.
