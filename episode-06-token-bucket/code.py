"""
The Bucket That Never Overflows — Token Bucket Rate Limiter

A bucket holds up to `capacity` tokens and refills at `refill_rate`
tokens per second. Each request costs one token. No background timer:
the refill is computed lazily, only when a request actually arrives.
"""

import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_check = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.last_check = now

        # Lazily refill based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)  # 5 burst, 1/sec sustained

    # Burn the whole burst instantly
    for i in range(7):
        print(f"request {i}: {'ALLOW' if bucket.allow_request() else 'DENY'}")

    # Wait for a partial refill, then try again
    time.sleep(3)
    print(f"after 3s wait: {'ALLOW' if bucket.allow_request() else 'DENY'}")
