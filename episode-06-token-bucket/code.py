"""Token Bucket rate limiter.

A bucket holds up to `capacity` tokens and refills at `refill_rate`
tokens per second. Every request costs one token; no token, no service.
"""

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
    # 5 tokens max, refilling 1 token every second.
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 7 requests arriving instantly.
    for i in range(1, 8):
        print(f"request {i}: {'allowed' if bucket.allow() else 'rejected'}")

    print("waiting 2 seconds for refill...")
    time.sleep(2)
    print(f"request 8: {'allowed' if bucket.allow() else 'rejected'}")
