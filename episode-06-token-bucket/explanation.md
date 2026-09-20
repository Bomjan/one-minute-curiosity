# The Bucket That Never Overflows

Every API you've ever used says the same quiet threat: *"429 Too Many Requests."* Behind that message is almost always the same tiny, elegant algorithm — the **Token Bucket** — and it's one of those ideas that feels obvious in hindsight but takes most developers years to actually see.

---

## The Problem

Imagine a bucket that holds a fixed number of tokens — say, 10. Every request you want to make costs one token. The bucket refills at a steady rate, say 2 tokens per second, but it never overflows past its capacity.

- If you have tokens, you spend one and go.
- If the bucket is empty, you wait — or get rejected.

This single idea lets a system do two things that seem contradictory: **allow sudden bursts of traffic** (spend everything in the bucket at once) while still **enforcing a long-term average rate** (because the bucket only refills so fast). A fixed "max N requests per second" counter can't do both — it either blocks legitimate bursts or lets bursts through with no real limit.

Think of it like a movie theater with 10 empty seats. People can rush in all at once if seats are free, but once they're full, new people trickle in only as fast as someone leaves.

## Example

Bucket capacity: **5 tokens**, refill rate: **1 token/second**.

```
t=0.0s  bucket=5   → 5 requests arrive → all allowed, bucket=0
t=0.5s  bucket=0.5 → 1 request arrives → rejected (needs 1, has 0.5)
t=1.2s  bucket=1.2 → 1 request arrives → allowed, bucket=0.2
t=5.0s  bucket=5.0 (capped) → burst of 5 → all allowed again
```

Notice how the bucket "remembers" idle time as saved-up capacity, but never lets that capacity exceed 5. That's the whole trick.

## Why It Matters

Token bucket (and its cousin, leaky bucket) is the algorithm quietly running behind:

- **API rate limiting** — Stripe, GitHub, and AWS all throttle clients this way.
- **Network traffic shaping** — routers use it to smooth out bursty packet flows.
- **Distributed systems** — protecting a downstream service from being overwhelmed by a sudden spike upstream.
- **Cybersecurity** — slowing down brute-force login attempts without fully blocking legitimate bursts of retries.

It's the difference between a system that gracefully absorbs a spike and one that falls over — or between one that blocks real users just because they clicked twice.

## Solution

**The insight:** you don't need a background timer constantly "dripping" tokens into the bucket. You only need to know two things whenever a request arrives:

1. How many tokens were in the bucket last time you checked.
2. How much time has passed since then.

From those, you can compute *exactly* how many tokens should exist right now — `elapsed_time * refill_rate` — add that to the bucket (capped at capacity), then decide if the request can be paid for.

**Walkthrough for beginners:**
- Track `tokens` (current count) and `last_checked` (timestamp).
- On each request: compute `elapsed = now - last_checked`, refill `tokens = min(capacity, tokens + elapsed * rate)`, update `last_checked = now`.
- If `tokens >= 1`, subtract 1 and allow the request. Otherwise, reject it.

No loops, no background threads, no wasted CPU cycles when nobody's making requests — the bucket "catches up" lazily, exactly when it's needed.

## Code

### Python

```python
import time

class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_checked = time.monotonic()

    def allow_request(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_checked
        self.last_checked = now

        # Lazily refill based on how much time has passed
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


# Example: 5 tokens max, refilling 1 per second
bucket = TokenBucket(capacity=5, refill_rate=1)
print([bucket.allow_request() for _ in range(6)])
# [True, True, True, True, True, False]  -> burst of 5, then throttled
```

### JavaScript

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;       // max tokens the bucket can hold
    this.refillRate = refillRate;   // tokens added per second
    this.tokens = capacity;         // start full
    this.lastChecked = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastChecked) / 1000;
    this.lastChecked = now;

    // Lazily refill based on how much time has passed
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

// Example: 5 tokens max, refilling 1 per second
const bucket = new TokenBucket(5, 1);
console.log(Array.from({ length: 6 }, () => bucket.allowRequest()));
// [true, true, true, true, true, false] -> burst of 5, then throttled
```

## Complexity

- **Time Complexity:** `O(1)` per request — one subtraction, one comparison, no loops or scans.
- **Space Complexity:** `O(1)` per bucket — just two numbers (`tokens`, `lastChecked`), regardless of how much traffic flows through it. Scaling to millions of users just means millions of tiny, independent buckets (often one per API key, stored in Redis with a TTL).

## One Minute Insight

Rate limiting isn't about saying "no" — it's about turning an unpredictable stream of requests into a bucket with math you can reason about. The moment you can describe your traffic policy in two numbers (capacity and refill rate), you've turned a hard operational problem into a five-line function.
