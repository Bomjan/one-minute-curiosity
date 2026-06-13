import time


class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity        # max tokens the bucket can hold
        self.refill_rate = refill_rate  # tokens added per second
        self.tokens = capacity          # start full
        self.last_refill = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        elapsed = now - self.last_refill

        # Refill based on elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


if __name__ == "__main__":
    limiter = TokenBucket(capacity=5, refill_rate=1)

    # Burst of 6 requests at once
    for i in range(6):
        print(f"Request {i + 1}: {'ALLOWED' if limiter.allow_request() else 'REJECTED'}")
