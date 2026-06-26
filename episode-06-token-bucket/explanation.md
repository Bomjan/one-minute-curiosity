# The Bucket That Decides If You're "Too Fast"

Every time an API tells you `429 Too Many Requests`, there's a tiny bucket of imaginary tokens somewhere quietly running out — and the algorithm behind it is shockingly simple.

---

## The Problem

You're building an API. You want to let clients make requests *quickly in bursts*, but stop them from hammering your server forever. You need a rate limiter that:

1. Allows a burst of requests up to some capacity.
2. Refills slowly over time so it never fully starves clients.
3. Costs **O(1) time and O(1) space per client** — no timers, no queues, no cron jobs.

This is exactly what a **water tank with a leaky inflow pipe** does: water (tokens) drips in at a fixed rate, you can draw from the tank as long as it has water, and once it's empty you have to wait for it to refill.

This is the **Token Bucket Algorithm** — the same mechanism behind AWS API Gateway, Stripe's API, and most reverse proxies (Nginx, Envoy) doing rate limiting today.

---

## Example

```
Bucket capacity: 5 tokens
Refill rate: 1 token / second

t=0s   bucket = 5   request → allowed   bucket = 4
t=0s   bucket = 4   request → allowed   bucket = 3
t=0s   bucket = 3   request → allowed   bucket = 2
t=0s   bucket = 2   request → allowed   bucket = 1
t=0s   bucket = 1   request → allowed   bucket = 0
t=0s   bucket = 0   request → DENIED   (no tokens left)
t=3s   bucket refills to 3 (3 seconds * 1 token/s)
t=3s   request → allowed   bucket = 2
```

No request ever gets queued or delayed artificially — it's either allowed immediately or rejected immediately. The bucket just remembers "how much capacity has accumulated since I last checked."

---

## Why It Matters

The token bucket is the workhorse of **traffic shaping**, and the pattern shows up everywhere:

| Domain | Where it lives |
| :--- | :--- |
| **Web/API design** | Per-user or per-IP rate limiting (`429` responses) |
| **Networking** | TCP/QoS traffic shaping, leaky-bucket variants in routers |
| **Distributed systems** | Throttling retries to avoid thundering-herd failures |
| **Cybersecurity** | Slowing brute-force login attempts without blocking legit bursts |
| **Cloud infra** | AWS, GCP, and Stripe all rate-limit their public APIs this way |

The elegant part: it needs **no background thread**. The bucket "refills" lazily — only computed at the moment someone asks "can I have a token?"

---

## Solution

### The Key Insight: Don't Simulate Time, Just Compute It

A naive implementation ticks a clock every second and adds a token — wasteful and stateful. The clever version stores only two things:

- `tokens`: how many tokens are currently available
- `last_refill_time`: when we last checked

When a request comes in:

1. Compute elapsed time since `last_refill_time`.
2. Add `elapsed * refill_rate` tokens (capped at `capacity`).
3. Update `last_refill_time` to now.
4. If `tokens >= 1`, consume one and allow the request. Otherwise, deny it.

That's it — refill math happens **on demand**, not on a schedule.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 1 token/sec
tokens = 5, last_refill = t0

Request at t0:    elapsed=0   → tokens stays 5 → consume → tokens=4 → ALLOW
Request at t0:    elapsed=0   → tokens=4 → consume → tokens=3 → ALLOW
... (3 more requests drain the bucket to 0)
Request at t0:    tokens=0 → DENY

Request at t0+3s: elapsed=3   → tokens = min(5, 0 + 3*1) = 3 → consume → tokens=2 → ALLOW
```

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
        self.last_refill = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 burst, 1/sec refill

    # Burst of 6 immediate requests — the 6th should be denied
    for i in range(6):
        print(f"Request {i + 1}: {'ALLOWED' if bucket.allow_request() else 'DENIED'}")

    print("Waiting 3 seconds for refill...")
    time.sleep(3)
    print(f"Request after wait: {'ALLOWED' if bucket.allow_request() else 'DENIED'}")
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

const bucket = new TokenBucket(5, 1); // 5 burst, 1/sec refill

// Burst of 6 immediate requests — the 6th should be denied
for (let i = 1; i <= 6; i++) {
    console.log(`Request ${i}: ${bucket.allowRequest() ? "ALLOWED" : "DENIED"}`);
}

console.log("Waiting 3 seconds for refill...");
setTimeout(() => {
    console.log(`Request after wait: ${bucket.allowRequest() ? "ALLOWED" : "DENIED"}`);
}, 3000);
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(1) per request | Refill math is a single subtraction + multiplication, no loops |
| **Space** | O(1) per client | Only `tokens` and `lastRefill` are stored — no history, no queue |

Compare this to naive approaches that store a timestamp for every request and count how many fall in the last second (a sliding window) — those cost O(k) space per client, where k is the request count in the window. The token bucket trades a little precision for *constant* memory, which is why it scales to millions of clients.

---

## One Minute Insight

> **You don't need a clock ticking in the background to model time passing — you just need to remember "when," and compute "how much" the moment someone asks.** Lazy evaluation isn't just a programming trick; it's how real-world rate limiters stay cheap at massive scale.

The next time you see a `Retry-After` header, picture a tiny bucket somewhere, quietly doing subtraction.

*Run `code.py` or `code.js` to watch a burst get throttled in real time.*
