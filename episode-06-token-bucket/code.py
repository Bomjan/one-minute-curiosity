import time


class TokenBucket:
    """A bucket that refills with tokens over time and spends them on requests."""

    def __init__(self, capacity, refill_rate):
        self.capacity = capacity          # max tokens the bucket can hold (burst size)
        self.refill_rate = refill_rate    # tokens added per second
        self.tokens = capacity            # start full
        self.last_check = time.monotonic()

    def allow_request(self, tokens_needed=1):
        now = time.monotonic()
        elapsed = now - self.last_check
        self.last_check = now

        # Refill based on time passed, never exceeding capacity
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= tokens_needed:
            self.tokens -= tokens_needed
            return True
        return False


if __name__ == "__main__":
    # Allows bursts of up to 5 requests, then throttles to 1 request/sec
    bucket = TokenBucket(capacity=5, refill_rate=1)

    for i in range(7):
        allowed = bucket.allow_request()
        print(f"Request {i + 1}: {'allowed' if allowed else 'rejected'}")
