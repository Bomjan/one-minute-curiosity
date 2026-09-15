# The Bucket That Lets You Burst (But Not Cheat)

Every API you've ever called has a bouncer standing at the door, and it isn't counting requests per minute the way you'd guess. It's counting **tokens in a bucket** — and understanding that bucket explains why your app sometimes gets a sudden `429 Too Many Requests` even though you "should" be under the limit.

---

## The Problem

You're building an API, and you need to stop any single client from hammering it. The naive fix — "reject requests after N per minute" — has a flaw: it either punishes normal bursty behavior (a user opening 10 tabs at once) or lets a client blast all N requests in the first millisecond of every window, then go silent, then blast again at the window boundary.

You want a limiter that:

1. Allows short, reasonable **bursts** (a page load firing 5 requests at once).
2. Enforces a strict **long-term average rate** (never more than R requests/second, sustained).
3. Runs in **O(1) time and space per client** — no sliding window of timestamps to store.

**Your goal:** design a counter that smooths traffic without a history log.

---

## Example

A bucket holds **5 tokens**, refilling **1 token per second**. Seven requests arrive instantly:

```
request 1: allowed   (tokens: 5 -> 4)
request 2: allowed   (tokens: 4 -> 3)
request 3: allowed   (tokens: 3 -> 2)
request 4: allowed   (tokens: 2 -> 1)
request 5: allowed   (tokens: 1 -> 0)
request 6: rejected  (tokens: 0, none refilled yet)
request 7: rejected  (tokens: 0)

... 2 seconds pass, bucket refills to 2 tokens ...

request 8: allowed   (tokens: 2 -> 1)
```

The first 5 requests burst through freely — that's the client's saved-up capacity. After that, the client is throttled to exactly the refill rate, no faster.

---

## Why It Matters

The token bucket (and its cousin, the leaky bucket) is the default throttle behind almost every rate-limited system you touch:

| Domain | Real-World Use |
| :--- | :--- |
| **Web engineering** | API gateways (Stripe, GitHub, Cloudflare) capping requests per API key |
| **Cybersecurity** | Slowing brute-force login attempts without locking out real users entirely |
| **Distributed systems** | Per-tenant throttling so one noisy customer can't starve a shared service |
| **Networking** | Traffic shaping and QoS on routers — smoothing bursty packet flows |
| **AI** | LLM API quota management — allowing short bursts of requests within a token budget |
| **Databases** | Limiting bursts of connections or queries per client to protect a shared pool |

The deeper lesson: **you rarely need to remember history to control the future — a single running total, updated lazily, is often enough.**

---

## Solution

### The Key Insight: Refill Lazily, Not on a Timer

You don't need a background thread ticking every second to add tokens. Instead, every time a request arrives, compute *how much time has passed* since the last check and top up the bucket proportionally — capped at capacity. Then spend a token if one is available.

```
tokens = min(capacity, tokens + elapsed_seconds * refill_rate)
```

This single line replaces any need for a timer, a queue of timestamps, or a scheduled job. The bucket "catches up" exactly when it's asked a question.

### Step-by-Step Walkthrough

1. **Initialize** the bucket full, at `capacity` tokens.
2. **On each request:**
   - Compute `elapsed` time since the last refill check.
   - Add `elapsed * refill_rate` tokens, capped at `capacity`.
   - If at least 1 token is available, subtract it and **allow** the request.
   - Otherwise, **reject** it.
3. Because refilling happens inline with each check, idle buckets cost nothing — no wasted CPU ticking away in the background.

That's it: one float, one timestamp, one comparison. No history required.

---

## Code

### Python

```python
import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens added per second
        self.tokens = capacity
        self.last_check = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_check = now

    def allow(self, cost=1):
        self._refill()
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    for i in range(1, 8):
        print(f"request {i}: {'allowed' if bucket.allow() else 'rejected'}")

    print("waiting 2 seconds for refill...")
    time.sleep(2)
    print(f"request 8: {'allowed' if bucket.allow() else 'rejected'}")
```

### JavaScript

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate; // tokens added per second
        this.tokens = capacity;
        this.lastCheck = Date.now();
    }

    _refill() {
        const now = Date.now();
        const elapsed = (now - this.lastCheck) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
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

const bucket = new TokenBucket(5, 1);

for (let i = 1; i <= 7; i++) {
    console.log(`request ${i}: ${bucket.allow() ? "allowed" : "rejected"}`);
}

console.log("waiting 2 seconds for refill...");
setTimeout(() => {
    console.log(`request 8: ${bucket.allow() ? "allowed" : "rejected"}`);
}, 2000);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | One subtraction, one comparison, one elapsed-time calculation |
| **Space** | O(1) per client | Just two numbers: current token count and last-check timestamp |

Compare that to a sliding-window log, which needs O(k) memory per client for k requests in the window. The token bucket gets the same guarantee — a bounded rate over time — for a constant, tiny footprint.

---

## One Minute Insight

> **A rate limit isn't a wall — it's a budget that refills.** The token bucket lets you spend savings (burst) as long as you never outspend your income (sustained rate) for long.

That's also why it beats a strict fixed window: a fixed window resets to full capacity at an arbitrary boundary, letting a client double up at the seam (max burst at the end of one window, then another at the start of the next). A token bucket has no seams — it's continuous, self-correcting, and it never needs to "remember" anything beyond right now.

*Run `code.py` or `code.js` to see it in action.*
