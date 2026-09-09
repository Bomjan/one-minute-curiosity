# Agreeing on a Secret Without Ever Sharing It

## The Problem

Alice and Bob want to talk privately. The problem: their only channel is public — anyone (call her Eve) can read every message that passes between them. They need to agree on a shared secret number so they can encrypt their conversation, but the moment either of them says the secret out loud, Eve knows it too.

Here's the trick that makes modern encryption possible: **you can agree on a secret in public, as long as the process of agreeing is easy to do but hard to undo.**

Think of mixing paint. Alice and Bob agree publicly on a starting color — say, yellow. Each of them privately mixes in their own secret color at home. They swap their mixed results in public. Anyone watching sees the swapped mixtures, but mixed paint can't be unmixed — Eve can't extract the private color from the blend. Then Alice and Bob each add their *own* secret color to the mixture they received, and — because mixing is order-independent — they both land on the exact same final color. Eve, watching the whole exchange, never saw enough to reproduce it.

That's the **Diffie–Hellman key exchange**, except instead of paint, it uses modular exponentiation — a mathematical operation that's cheap to compute forward and (believed to be) computationally infeasible to reverse.

## Example

Using small numbers so you can follow by hand:

```
Public, agreed by everyone (including Eve): p = 23, g = 5

Alice picks a private number:  a = 6   → sends A = 5^6 mod 23  = 8
Bob picks a private number:    b = 15  → sends B = 5^15 mod 23 = 19

Alice computes: B^a mod p = 19^6  mod 23 = 2
Bob computes:   A^b mod p = 8^15  mod 23 = 2

Shared secret = 2 — agreed without ever transmitting "2", "a", or "b".
```

Eve saw `p`, `g`, `A`, and `B` — but recovering `a` or `b` from those requires solving the **discrete logarithm problem**, which for large enough numbers (thousands of bits) is out of reach for any known algorithm.

## Why It Matters

This is not a toy. This exact idea, scaled up to enormous numbers, underpins:

- **TLS/HTTPS** — every time your browser shows a padlock, a Diffie–Hellman-style exchange (often elliptic-curve DH) just happened to set up your session key.
- **SSH** — the handshake before you can type a single command on a remote server.
- **Signal / WhatsApp** — the "double ratchet" protocol re-runs DH-like exchanges constantly for forward secrecy, so that even if today's key leaks, yesterday's messages stay safe.
- **VPNs** — establishing a tunnel without a pre-shared secret.

The deeper insight for engineers: security doesn't always come from *hiding* information. Sometimes it comes from making a computation **easy in one direction and brutally hard in reverse** — the same one-way-function idea shows up in password hashing, proof-of-work, and digital signatures.

## Solution

**Clean explanation:** Pick a public prime `p` and a public base `g`. Each party picks a private random number, raises `g` to that power mod `p`, and shares the result. Each party then raises the *other's* public value to their *own* private power. Because `(g^a)^b mod p == (g^b)^a mod p == g^(ab) mod p`, both sides land on the same number — without either private number ever crossing the wire.

**Optimized thinking process:** The only expensive-looking step is exponentiation, but modular exponentiation can be done in O(log exponent) multiplications using **fast exponentiation** (repeated squaring) instead of naively multiplying the base by itself thousands of times.

**Beginner-friendly walkthrough:**
1. Agree publicly on `p` (a large prime) and `g` (a primitive root mod `p`).
2. Alice picks a secret `a`, computes `A = g^a mod p`, sends `A`.
3. Bob picks a secret `b`, computes `B = g^b mod p`, sends `B`.
4. Alice computes `B^a mod p`. Bob computes `A^b mod p`. Both equal `g^(ab) mod p`.
5. That shared number becomes the encryption key for the rest of the conversation.

## Code

### Python

```python
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

    # Public values — safe to broadcast, even to an eavesdropper.
    alice_public = fast_pow_mod(g, alice_private, p)
    bob_public = fast_pow_mod(g, bob_private, p)

    # Each side combines the OTHER's public value with their OWN private key.
    alice_shared = fast_pow_mod(bob_public, alice_private, p)
    bob_shared = fast_pow_mod(alice_public, bob_private, p)

    assert alice_shared == bob_shared
    print(f"Shared secret agreed in public: {alice_shared}")

if __name__ == "__main__":
    # NOTE: p, g here are toy-sized for demonstration only.
    # Real systems use primes with thousands of bits.
    diffie_hellman_demo(p=23, g=5)
```

### JavaScript

```javascript
function fastPowMod(base, exp, mod) {
  // Modular exponentiation via repeated squaring: O(log exp)
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

function randomPrivateKey(max) {
  // Toy randomness for demo purposes — use a CSPRNG in production.
  return BigInt(2 + Math.floor(Math.random() * (Number(max) - 2)));
}

function diffieHellmanDemo(p, g) {
  const alicePrivate = randomPrivateKey(p);
  const bobPrivate = randomPrivateKey(p);

  // Public values — safe to broadcast, even to an eavesdropper.
  const alicePublic = fastPowMod(g, alicePrivate, p);
  const bobPublic = fastPowMod(g, bobPrivate, p);

  // Each side combines the OTHER's public value with their OWN private key.
  const aliceShared = fastPowMod(bobPublic, alicePrivate, p);
  const bobShared = fastPowMod(alicePublic, bobPrivate, p);

  console.assert(aliceShared === bobShared, "Key agreement failed");
  console.log(`Shared secret agreed in public: ${aliceShared}`);
}

// NOTE: p, g here are toy-sized for demonstration only.
diffieHellmanDemo(23n, 5n);
```

## Complexity

- **Time Complexity:** `O(log e)` per modular exponentiation, where `e` is the exponent — thanks to repeated squaring instead of naive multiplication. Real-world key sizes (2048+ bits) still finish in milliseconds.
- **Space Complexity:** `O(1)` beyond the fixed-size integers involved — no history, no stored state, nothing to leak.

## One Minute Insight

You don't need to hide *how* the lock works — you just need a door that's trivial to close and practically impossible to pick open from the wrong side. That's the whole idea behind modern cryptography, in one paint-mixing analogy.
