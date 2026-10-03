# The Bouncer With a Bucket

Every API you love has a rate limiter, and the best one needs no timer at all: it just does a little arithmetic when you knock.

---

## The Problem

Your API gets hammered. You want to allow **short bursts** (a page load fires 5 requests at once) but cap the **average rate** (no more than 1 request per second over time).

Think of a bucket that holds up to `capacity` tokens. Tokens drip in at a steady rate. Each request spends one token. Empty bucket? Request denied.

The catch: how do you "drip" tokens without a background thread ticking for every user?

---

## Example

```
capacity = 3, refill = 1 token/sec

t=0s  : 5 requests -> allow, allow, allow, DENY, DENY
t=1s  : 2 requests -> allow, DENY          (1 token dripped in)
t=10s : 4 requests -> allow, allow, allow, DENY  (bucket refilled, capped at 3)
```

---

## Why It Matters

- **API gateways** (Stripe, GitHub, Cloudflare-style limits) use this family of algorithms.
- **Networking**: traffic shaping and QoS in routers.
- **Cybersecurity**: slowing brute-force login attempts and credential stuffing.
- **Distributed systems**: protecting a service from a retry storm.

---

## Solution

**Naive idea:** a timer adds a token every second for every user. Millions of users means millions of timers. Wasteful.

**The trick: lazy refill.** Store only two numbers per user: `tokens` and `last` (timestamp of the last request). When a request arrives:

1. `elapsed = now - last`
2. `tokens = min(capacity, tokens + elapsed * rate)`
3. If `tokens >= cost`, spend it and allow. Otherwise deny.

The bucket never "runs" between requests. It's computed on demand, so an idle user costs nothing.

Two details that matter in production:
- Use a **monotonic clock**, so wall-clock adjustments can't mint free tokens.
- **Cap at capacity**, otherwise a user who was away for a day could burst 86,400 requests.

---

## Code

See [`code.py`](./code.py) and [`code.js`](./code.js). Both accept an injectable clock so the demo is deterministic.

```python
def allow(self, cost=1):
    now = self.clock()
    elapsed = now - self.last
    self.last = now
    self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
    if self.tokens >= cost:
        self.tokens -= cost
        return True
    return False
```

---

## Complexity

- **Time:** O(1) per request.
- **Space:** O(1) per user (two numbers).

---

## One Minute Insight

> The cheapest way to model the passage of time is to not model it. Store *when*, compute *how much* later.
