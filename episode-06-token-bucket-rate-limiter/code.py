"""
Token Bucket Rate Limiter

A bucket holds `capacity` tokens and refills at `refill_rate` tokens/second.
Every request spends one token. No tokens left → the request is denied.

The trick: instead of ticking a timer every second, we compute how many
tokens *should* have been added since the last check, lazily, on demand.
"""

import time


class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_refill = time.monotonic()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def allow_request(self) -> bool:
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    bucket = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests — the 6th should be denied (bucket only holds 5)
    for i in range(6):
        print(f"Request {i + 1}: {'allowed' if bucket.allow_request() else 'denied'}")

    print("\nWaiting 3 seconds for the bucket to refill...")
    time.sleep(3)

    print(f"Request 7: {'allowed' if bucket.allow_request() else 'denied'}")
