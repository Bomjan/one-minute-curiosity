def mod_pow(base, exponent, modulus):
    """Fast modular exponentiation: base^exponent mod modulus, in O(log exponent)."""
    result = 1
    base %= modulus
    while exponent > 0:
        if exponent & 1:                    # odd bit -> fold it into the result
            result = (result * base) % modulus
        exponent >>= 1
        base = (base * base) % modulus      # square the base each round
    return result


def diffie_hellman_demo(p, g, alice_secret, bob_secret):
    alice_public = mod_pow(g, alice_secret, p)
    bob_public = mod_pow(g, bob_secret, p)

    # Each side combines the OTHER's public value with their OWN private secret
    alice_shared = mod_pow(bob_public, alice_secret, p)
    bob_shared = mod_pow(alice_public, bob_secret, p)

    assert alice_shared == bob_shared
    return alice_shared


if __name__ == "__main__":
    # Textbook-small values for demonstration; real usage needs 2048+ bit primes
    p, g = 23, 5

    secret = diffie_hellman_demo(p, g, alice_secret=6, bob_secret=15)
    print(f"Shared secret: {secret}")  # 2

    # A different pair of secrets still agrees on a shared value
    secret2 = diffie_hellman_demo(p, g, alice_secret=4, bob_secret=13)
    print(f"Shared secret: {secret2}")
