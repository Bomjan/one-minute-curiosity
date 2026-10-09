# The Bouncer With No Timer

A rate limiter that allows bursts, caps the long-run rate, and needs no background thread: it just does a little arithmetic when you knock.

---

## The Problem

Imagine a bucket that holds at most `capacity` tokens. Every request must spend a token. Tokens drip back in at `rate` per second, but the bucket never overflows.

The naive build is a timer that adds a token every second. At a million users, that is a million timers.

**Your goal:** Implement `allow()` so it answers "may this request pass?" in constant time, with no timers or threads.

---

## Example

```
capacity = 5, refill = 1 token/sec

t=0s   7 rapid requests  -> ✅✅✅✅✅ ❌❌   (burst of 5, then throttled)
t=2s   3 rapid requests  -> ✅✅ ❌          (2 tokens dripped back in)
```

---

## Why It Matters

This is how real systems protect themselves: API gateways, Nginx/Envoy limits, cloud provider quotas, login-attempt throttling against brute force, and LLM API rate limits. It is friendlier than a fixed "N per minute" window because normal bursty traffic passes while sustained abuse does not.

---

## Solution

**The trick: refill lazily.** Don't simulate the drip. Store just two numbers: `tokens` and the `last` timestamp.

1. When a request arrives, compute `elapsed = now - last`.
2. Add `elapsed * rate` tokens, capped at `capacity`.
3. If `tokens >= cost`, spend them and allow. Otherwise reject.

The bucket looks continuously filled, but it only does work when someone asks, like a bouncer who counts how long you were away instead of watching the door.

Two details worth getting right:
- Use a **monotonic clock**. Wall clocks can jump backwards (NTP, daylight saving) and hand out free tokens.
- Inject the clock so the limiter is testable without `sleep()`.

---

## Code

See [`code.py`](./code.py) and [`code.js`](./code.js).

```python
def allow(self, cost=1):
    now = self.clock()
    self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
    self.last = now
    if self.tokens >= cost:
        self.tokens -= cost
        return True
    return False
```

---

## Complexity

- **Time:** O(1) per request.
- **Space:** O(1) per bucket (two numbers). One bucket per user or IP gives O(users) overall.

---

## One Minute Insight

> The cheapest way to track the passage of time is to not track it at all. Store a timestamp and compute what you missed when someone asks.

In distributed systems the same idea appears again and again: lazy evaluation beats background work.
