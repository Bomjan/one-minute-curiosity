# The Bucket That Controls the Internet

Every time you hit an API too fast and get a `429 Too Many Requests`, a tiny bucket somewhere just ran dry.

---

## The Problem

Imagine a bucket that holds tokens. Every request you make costs **one token**. The bucket refills itself at a steady rate — say, **2 tokens per second** — but it can never hold more than its **capacity**.

- Bucket has tokens? → Request goes through, one token is removed.
- Bucket is empty? → Request is rejected (or delayed) until it refills.

This is the **Token Bucket Algorithm**, and it's the quiet gatekeeper behind almost every rate-limited API, login throttle, and network traffic shaper on the internet.

The tricky part: you don't want a background timer constantly "dripping" tokens into millions of buckets for millions of users. That would be a scheduling nightmare. So — how do you refill a bucket **without ever running a clock**?

---

## Example

```
Bucket capacity: 5 tokens
Refill rate: 1 token / second

t=0s   → bucket = 5  → request → ALLOWED (bucket = 4)
t=0s   → request → ALLOWED (bucket = 3)
t=0s   → request → ALLOWED (bucket = 2)
t=0s   → request → ALLOWED (bucket = 1)
t=0s   → request → ALLOWED (bucket = 0)
t=0s   → request → DENIED  (bucket = 0)

... wait 3 seconds ...

t=3s   → bucket refills to min(5, 0 + 3*1) = 3
t=3s   → request → ALLOWED (bucket = 2)
```

---

## Why It Matters

The token bucket pattern shows up everywhere:

| Domain | Real-World Use |
| :--- | :--- |
| **Web APIs** | GitHub, Stripe, and Twitter limit requests per user/IP per minute |
| **Networking** | Routers shape traffic bursts using token/leaky buckets (QoS) |
| **Cybersecurity** | Throttling login attempts to slow brute-force attacks |
| **Distributed systems** | Preventing one noisy client from starving shared resources |
| **Cloud billing** | Enforcing "burstable" quotas (allow short spikes, cap sustained load) |

The deeper lesson: **you can model "rate" without a clock thread** — just compare timestamps when something actually happens.

---

## Solution

### The Key Insight: Refill Lazily, on Demand

Instead of ticking every millisecond, store **two things** per bucket:
1. The current token count
2. The timestamp of the last refill

When a new request arrives:
1. Compute `elapsed = now - last_refill_time`
2. Add `elapsed * refill_rate` tokens (capped at `capacity`)
3. Update `last_refill_time = now`
4. If `tokens >= 1`, allow the request and subtract 1. Otherwise, deny it.

No timers. No background jobs. Just **math on timestamps**, computed only when someone actually knocks on the door.

### Step-by-Step Walkthrough

```
capacity = 5, refill_rate = 1 token/sec
tokens = 5, last_refill = t0

Request at t0:    elapsed=0 → tokens stays 5 → allow → tokens=4
Request at t0+5s: elapsed=5 → tokens = min(5, 4+5) = 5 → allow → tokens=4
Request at t0+5s: elapsed=0 → tokens stays 4 → allow → tokens=3
```

Each check is **O(1)** — a subtraction, a multiplication, and a comparison.

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

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_refill

        # Refill lazily based on time passed since the last check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 tokens, refills 1/sec

    # Burst of 6 quick requests — the 6th should be denied
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

    allowRequest() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;

        // Refill lazily based on time passed since the last check
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}


const bucket = new TokenBucket(5, 1); // 5 tokens, refills 1/sec

// Burst of 6 quick requests — the 6th should be denied
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
| **Time** | O(1) | Each request check is just arithmetic on two stored numbers |
| **Space** | O(1) per bucket | Only `tokens` and `last_refill` are stored — no history needed |

Compare this to naively storing a timestamp for every past request and counting how many fall in the last N seconds — that's O(n) memory and time per check. The token bucket collapses an entire history into two numbers.

---

## One Minute Insight

> **You don't need to track time — you need to measure it when it matters.** The token bucket never "runs" between requests; it simply reconstructs the present state from a timestamp the moment someone asks. This same trick — lazy, on-demand recomputation instead of constant background work — powers everything from cache expiration to physics engines to animation frames.

*Run `code.py` or `code.js` to see it in action.*
