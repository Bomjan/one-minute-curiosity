# The Secret Two Strangers Can Agree On in Public

Alice and Bob have never met. They can only talk on a line that Eve is actively wiretapping — she hears every single word. And yet, by the end of the conversation, Alice and Bob share a secret number that Eve, despite hearing everything, cannot compute.

---

## The Problem

You want two people to agree on a shared secret key over a completely public, insecure channel — no prior meeting, no trusted courier, no pre-shared password. Every message they exchange is visible to an eavesdropper.

It sounds impossible. If Eve sees *everything* that Alice sends Bob and everything Bob sends Alice, how can they end up knowing something Eve doesn't?

The trick isn't hiding the messages. It's choosing math where **combining is easy but reversing is hard** — a one-way street for numbers.

---

## Example

```
Publicly agreed (Eve sees these too): prime p = 23, base g = 5

Alice picks secret a = 6          Bob picks secret b = 15
Alice sends:  A = 5^6  mod 23 = 8      →
                                  ←  Bob sends:  B = 5^15 mod 23 = 19

Alice computes: B^a mod 23 = 19^6  mod 23 = 2
Bob computes:   A^b mod 23 = 8^15  mod 23 = 2

Shared secret = 2  (Eve saw p, g, A=8, B=19 — but never a, b, or 2)
```

---

## Why It Matters

This isn't a toy puzzle — it's the handshake running underneath the internet right now:

| Domain | Where this idea lives |
| :--- | :--- |
| **Cybersecurity / TLS** | Every HTTPS connection negotiates a session key this way (ECDHE in the TLS handshake) |
| **Networking** | VPNs establish encrypted tunnels without ever transmitting the key itself |
| **Messaging apps** | Signal's key exchange builds on the same discrete-log hardness |
| **Systems design** | Any two services that must agree on a secret over an untrusted network |

The deeper idea generalizes: **build a function that's cheap to compute forward and expensive to invert.** That single asymmetry is the foundation of modern public-key cryptography.

---

## Solution

### The Key Insight: Exponents Commute, Logs Don't

Modular exponentiation has a beautiful property:

```
(g^a mod p)^b mod p  =  (g^b mod p)^a mod p  =  g^(a*b) mod p
```

Alice raises Bob's public value to *her* secret. Bob raises Alice's public value to *his* secret. Both land on the same number, `g^(ab) mod p`, without either ever sending `a`, `b`, or the final secret.

Eve sees `p`, `g`, `A = g^a mod p`, and `B = g^b mod p`. To recover the secret, she'd need to extract `a` from `A` — the **discrete logarithm problem**. For small numbers like our example, that's a quick brute force. For a 2048-bit prime, it's computationally infeasible with any known algorithm — that gap is the entire security guarantee.

### Beginner-Friendly Walkthrough

1. Alice and Bob publicly agree on a prime `p` and a base `g` (no secrecy needed here).
2. Each privately picks a secret number (`a` for Alice, `b` for Bob) and never shares it.
3. Each computes a public value (`g^secret mod p`) and sends *that* across the wire.
4. Each raises the *other person's* public value to their *own* secret.
5. Math guarantees they land on the identical number — the shared secret — while Eve is left holding pieces she can't reassemble.

---

## Code

### Python

```python
def mod_pow(base, exponent, modulus):
    """Fast modular exponentiation: base^exponent mod modulus."""
    return pow(base, exponent, modulus)


def diffie_hellman_demo():
    # Public parameters (safe to shout across the room)
    p = 23   # prime modulus
    g = 5    # generator/base

    # Private secrets (never transmitted)
    alice_secret = 6
    bob_secret = 15

    # Public values exchanged over the "insecure" channel
    alice_public = mod_pow(g, alice_secret, p)
    bob_public = mod_pow(g, bob_secret, p)

    # Each side combines the other's public value with their own secret
    alice_shared = mod_pow(bob_public, alice_secret, p)
    bob_shared = mod_pow(alice_public, bob_secret, p)

    assert alice_shared == bob_shared
    return alice_shared


if __name__ == "__main__":
    secret = diffie_hellman_demo()
    print(f"Shared secret: {secret}")  # 2
```

### JavaScript

```javascript
function modPow(base, exponent, modulus) {
    // Fast modular exponentiation via square-and-multiply
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent & 1n) result = (result * base) % modulus;
        exponent >>= 1n;
        base = (base * base) % modulus;
    }
    return result;
}

function diffieHellmanDemo() {
    // Public parameters
    const p = 23n;
    const g = 5n;

    // Private secrets (never transmitted)
    const aliceSecret = 6n;
    const bobSecret = 15n;

    // Public values exchanged over the "insecure" channel
    const alicePublic = modPow(g, aliceSecret, p);
    const bobPublic = modPow(g, bobSecret, p);

    // Each side combines the other's public value with their own secret
    const aliceShared = modPow(bobPublic, aliceSecret, p);
    const bobShared = modPow(alicePublic, bobSecret, p);

    console.assert(aliceShared === bobShared, "Shared secrets must match");
    return aliceShared;
}

console.log(`Shared secret: ${diffieHellmanDemo()}`);  // 2
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(log e) per exponentiation | Square-and-multiply computes `g^e mod p` in ~log₂(e) multiplications, not `e` of them |
| **Space** | O(1) | Only a handful of numbers (`p`, `g`, secrets, public values) are ever stored |
| **Attacker's cost** | No known polynomial algorithm | Recovering `a` from `g^a mod p` (discrete log) is believed to require exponential time for well-chosen large primes |

---

## One Minute Insight

> **You don't need to hide a message to keep a secret — you need a door that only locks one way.** Diffie-Hellman never encrypts anything; it just exploits a function that's trivial to run forward and brutal to run backward.

That one asymmetry — easy forward, hard in reverse — is the seed every modern cryptographic protocol grows from. Once you see it here, you'll spot it again in RSA, in proof-of-work, in password hashing. The internet's trust model rests on math nobody has figured out how to undo... yet.

*Run `code.py` or `code.js` to watch two "strangers" agree on a secret in real time.*
