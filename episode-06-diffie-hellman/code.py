"""
Diffie-Hellman Key Exchange
Two parties agree on a shared secret over a public channel,
without ever transmitting the secret itself.
"""


def mod_pow(base, exponent, modulus):
    """Fast modular exponentiation: base^exponent mod modulus."""
    return pow(base, exponent, modulus)


def diffie_hellman_demo():
    # Public parameters (safe to shout across the room)
    p = 23   # prime modulus
    g = 5    # generator/base

    # Private secrets (never transmitted, known only to their owner)
    alice_secret = 6
    bob_secret = 15

    # Public values exchanged over the "insecure" channel
    alice_public = mod_pow(g, alice_secret, p)
    bob_public = mod_pow(g, bob_secret, p)

    # Each side combines the other's public value with their own secret.
    # Modular exponentiation makes both sides land on the same number.
    alice_shared = mod_pow(bob_public, alice_secret, p)
    bob_shared = mod_pow(alice_public, bob_secret, p)

    assert alice_shared == bob_shared, "Key exchange failed!"
    return alice_public, bob_public, alice_shared


if __name__ == "__main__":
    alice_public, bob_public, secret = diffie_hellman_demo()

    print(f"Alice's public value (seen by Eve): {alice_public}")
    print(f"Bob's public value   (seen by Eve): {bob_public}")
    print(f"Shared secret (never sent, never seen by Eve): {secret}")
