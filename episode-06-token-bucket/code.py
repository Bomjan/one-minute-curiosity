import time


class TokenBucket:
    """Allows bursts up to `capacity`, refills at `rate` tokens/second."""

    def __init__(self, capacity, rate, clock=time.monotonic):
        self.capacity = capacity
        self.rate = rate
        self.tokens = capacity
        self.clock = clock
        self.last_refill = clock()

    def _refill(self):
        now = self.clock()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    # A controllable fake clock keeps the demo deterministic
    fake_time = [0.0]
    bucket = TokenBucket(capacity=5, rate=1, clock=lambda: fake_time[0])

    # Burst of 5 requests at t=0 -> bucket starts full, all allowed
    for i in range(1, 6):
        print(f"Request {i} at t=0:", bucket.allow_request())  # True x5

    # 6th request immediately after -> denied, bucket is empty
    print("Request 6 at t=0:", bucket.allow_request())  # False

    # 3 seconds pass -> 3 tokens refill (capped at capacity)
    fake_time[0] = 3.0
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # True
    print("Request at t=3:", bucket.allow_request())  # False, only 3 tokens refilled
