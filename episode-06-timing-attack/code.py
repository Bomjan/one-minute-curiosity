"""
Episode 06: The Password Check That Leaks Its Own Secret
A naive `==` on secrets exits early on the first mismatch, letting an
attacker recover the secret by measuring response time. Compare in
constant time instead: never branch on a single character.
"""

import hmac


def constant_time_equals(secret: str, guess: str) -> bool:
    """Compare two equal-length strings without leaking match position via timing."""
    if len(secret) != len(guess):
        return False

    result = 0
    for a, b in zip(secret, guess):
        result |= ord(a) ^ ord(b)  # accumulate; never branch on a single mismatch
    return result == 0


if __name__ == "__main__":
    real_key = "a8f9c2"

    # Prefer the standard library in real code — it's audited and constant-time.
    print(hmac.compare_digest(real_key, "a8f9c2"))  # True
    print(hmac.compare_digest(real_key, "000000"))  # False

    # From-scratch version, to show the mechanism itself:
    print(constant_time_equals(real_key, "a8f9c2"))  # True
    print(constant_time_equals(real_key, "a80000"))  # False
