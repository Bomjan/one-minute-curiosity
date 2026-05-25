import hmac
import os
import time


SECRET_TOKEN = os.environ.get("API_TOKEN", "sk-super-secret-value")


def safe_compare(a: str, b: str) -> bool:
    """Constant-time string comparison — never short-circuits."""
    return hmac.compare_digest(a.encode(), b.encode())


def unsafe_compare(a: str, b: str) -> bool:
    """Vulnerable: exits on first mismatched character."""
    return a == b


def verify_request(user_token: str) -> bool:
    return safe_compare(user_token, SECRET_TOKEN)


def demonstrate_timing_leak():
    """
    Shows how early-exit comparison leaks position information.
    With enough samples, an attacker uses these tiny differences
    to reconstruct the secret one character at a time.
    """
    secret = "SECRETKEY"
    samples = 500_000

    def measure(guess):
        start = time.perf_counter_ns()
        for _ in range(samples):
            unsafe_compare(guess, secret)
        return (time.perf_counter_ns() - start) / samples

    no_match  = measure("XXXXXXXXX")  # no chars match
    one_match = measure("SXXXXXXXX")  # first char matches

    print(f"No chars match  : {no_match:.2f} ns/call")
    print(f"First char match: {one_match:.2f} ns/call")
    print(f"Difference      : {one_match - no_match:+.2f} ns  ← timing leak")
    print()
    print("With safe_compare, both calls take the same time:")

    no_match_safe  = measure_safe("XXXXXXXXX", secret, samples)
    one_match_safe = measure_safe("SXXXXXXXX", secret, samples)
    print(f"No chars match  : {no_match_safe:.2f} ns/call")
    print(f"First char match: {one_match_safe:.2f} ns/call")
    print(f"Difference      : {one_match_safe - no_match_safe:+.2f} ns")


def measure_safe(guess, secret, samples):
    start = time.perf_counter_ns()
    for _ in range(samples):
        safe_compare(guess, secret)
    return (time.perf_counter_ns() - start) / samples


if __name__ == "__main__":
    print("=== Correctness ===")
    print(safe_compare("hello", "hello"))   # True
    print(safe_compare("hello", "hellx"))   # False
    print(safe_compare("abc", "xyz"))       # False
    print()

    print("=== Token Verification ===")
    print(verify_request("sk-super-secret-value"))  # True
    print(verify_request("sk-wrong-value"))          # False
    print()

    print("=== Timing Leak Demo ===")
    demonstrate_timing_leak()
