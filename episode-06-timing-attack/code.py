"""
The Timing Attack: why `==` is the wrong way to compare secrets.

A naive comparison stops at the first mismatched character, so it runs
faster for wrong guesses and slower the closer a guess gets to the real
secret. An attacker who can measure response time can exploit that gap
to recover a secret one character at a time.

The fix: always touch every byte, no matter what.
"""

import hmac


def naive_compare(a: str, b: str) -> bool:
    """The vulnerable version — stops at the first mismatch."""
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:
            return False  # early exit leaks the mismatch position via timing
    return True


def constant_time_compare(a: str, b: str) -> bool:
    """Always inspects every byte, so timing reveals nothing."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)  # accumulates diffs, loop never shortcuts
    return result == 0


if __name__ == "__main__":
    secret = "hunter2"

    print(constant_time_compare(secret, "hunter2"))  # True
    print(constant_time_compare(secret, "hunter1"))  # False
    print(constant_time_compare(secret, "short"))    # False (length mismatch)

    # In production, just use the audited standard library version:
    print(hmac.compare_digest(secret, "hunter2"))    # True
