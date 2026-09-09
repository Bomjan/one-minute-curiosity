"""Diffie-Hellman key exchange: two parties agree on a shared secret
over a public channel, without ever transmitting the secret itself.

NOTE: p and g below are toy-sized for demonstration only. Real systems
use primes with thousands of bits.
"""

import secrets


def fast_pow_mod(base: int, exp: int, mod: int) -> int:
    """Modular exponentiation via repeated squaring: O(log exp)."""
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:
            result = (result * base) % mod
        base = (base * base) % mod
        exp >>= 1
    return result


def diffie_hellman_demo(p: int, g: int) -> None:
    # Each party's private key never leaves their machine.
    alice_private = secrets.randbelow(p - 2) + 2
    bob_private = secrets.randbelow(p - 2) + 2

    # Public values -- safe to broadcast, even to an eavesdropper.
    alice_public = fast_pow_mod(g, alice_private, p)
    bob_public = fast_pow_mod(g, bob_private, p)

    # Each side combines the OTHER's public value with their OWN private key.
    alice_shared = fast_pow_mod(bob_public, alice_private, p)
    bob_shared = fast_pow_mod(alice_public, bob_private, p)

    assert alice_shared == bob_shared
    print(f"Shared secret agreed in public: {alice_shared}")


if __name__ == "__main__":
    diffie_hellman_demo(p=23, g=5)
