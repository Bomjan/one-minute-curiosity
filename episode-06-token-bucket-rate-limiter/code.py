# Episode 06: Token Bucket Rate Limiter
# Allow or deny requests based on a bucket of tokens that refills over time.
# No background timers needed — refill is computed lazily on each check.

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
