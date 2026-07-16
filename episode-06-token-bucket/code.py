"""
Token Bucket Rate Limiter — the algorithm behind almost every API's
"429 Too Many Requests" response.

Idea: a bucket holds tokens. Every request costs one token. The bucket
refills gradually over time. No tokens left? The request waits or gets
rejected. Bursts are allowed (up to the bucket's capacity), but the
long-run average is capped by the refill rate.
"""

import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_refill = time.time()

    def _refill(self):
        # Lazy refill: only compute how many tokens accumulated
        # since the last check. No background timer needed.
        now = time.time()
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
    # 5 tokens max, refilling 1 token every 2 seconds
    bucket = TokenBucket(capacity=5, refill_rate=0.5)

    # Burst of 7 rapid requests: only the first 5 succeed immediately
    for i in range(1, 8):
        print(f"Request {i}: {'allowed' if bucket.allow_request() else 'denied'}")
