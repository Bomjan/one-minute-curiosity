# The Bucket That Decides Who Gets Served

Imagine a nightclub bouncer with a bucket of tokens. Every guest needs a token to get in. The bucket refills at a steady drip, and once it's full, extra tokens just spill over the side. That's the entire secret behind how APIs like Stripe, GitHub, and Twitter decide who gets rate-limited.

---

## The Problem

You're building an API that must allow **at most N requests per second per user**, but you also want to tolerate short bursts — a user shouldn't get blocked just because they sent 3 requests in the same millisecond after being idle for a while.

Naive fixed-window counters ("reset the counter every second") have an edge-case bug: a user can send N requests at the very end of one window and N more at the very start of the next, doubling the allowed rate for a brief moment.

**Your goal:** Design a rate limiter that smooths out bursts fairly, without storing a timestamp for every single request.

---

## Example

```
Bucket capacity: 5 tokens
Refill rate: 1 token / second

t=0s   bucket = 5   request → allowed (bucket = 4)
t=0s   bucket = 4   request → allowed (bucket = 3)
t=0s   bucket = 3   request → allowed (bucket = 2)
t=0s   bucket = 2   request → allowed (bucket = 1)
t=0s   bucket = 1   request → allowed (bucket = 0)
t=0s   bucket = 0   request → REJECTED (no tokens left)
t=3s   bucket refills to 3   request → allowed (bucket = 2)
```

The bucket lets you burst up to capacity, then throttles you down to the steady refill rate.

---

## Why It Matters

The Token Bucket is one of the most reused ideas in computer science, hiding under different names:

| Domain | Where it shows up |
| :--- | :--- |
| **Web engineering** | API rate limiting (GitHub, Stripe, Cloudflare) |
| **Networking** | Traffic shaping in routers (literally called "token bucket" in RFCs) |
| **Operating systems** | CPU scheduling quotas and I/O throttling |
| **Distributed systems** | Backpressure control between services |
| **Databases** | Throttling expensive queries per tenant |

The deeper lesson: **you don't need to remember history to enforce a rate — you just need to track capacity and time elapsed.**

---

## Solution

### The Key Insight: Lazy Refill

Instead of running a background timer that adds tokens every tick (wasteful), just compute how many tokens *should* have been added based on elapsed time, every time a request arrives.

```
tokens_now = min(capacity, tokens_stored + elapsed_seconds * refill_rate)
```

If `tokens_now >= 1`, consume one and allow the request. Otherwise, reject it.

### Step-by-Step Walkthrough

1. Store just two numbers per user: `tokens` (current count) and `last_checked` (timestamp).
2. On each request, calculate elapsed time since `last_checked`.
3. Add `elapsed * refill_rate` tokens, capped at `capacity`.
4. If at least 1 token is available, subtract one and allow the request.
5. Otherwise, reject it — no token, no entry.

This needs **O(1) memory per user** and **O(1) time per request** — no loops, no timers, no stored history.

---

## Complexity

- **Time:** O(1) per request — just arithmetic, no iteration.
- **Space:** O(1) per tracked entity (two numbers: tokens and timestamp).

---

## One Minute Insight

A rate limiter doesn't need to watch the clock constantly — it just needs to ask "how much time passed?" the moment someone shows up. Laziness, computed correctly, is an optimization.
