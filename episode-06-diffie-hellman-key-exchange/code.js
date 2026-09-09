// Diffie-Hellman key exchange: two parties agree on a shared secret
// over a public channel, without ever transmitting the secret itself.
//
// NOTE: p and g below are toy-sized for demonstration only. Real systems
// use primes with thousands of bits.

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
  // Toy randomness for demo purposes -- use a CSPRNG in production.
  return BigInt(2 + Math.floor(Math.random() * (Number(max) - 2)));
}

function diffieHellmanDemo(p, g) {
  const alicePrivate = randomPrivateKey(p);
  const bobPrivate = randomPrivateKey(p);

  // Public values -- safe to broadcast, even to an eavesdropper.
  const alicePublic = fastPowMod(g, alicePrivate, p);
  const bobPublic = fastPowMod(g, bobPrivate, p);

  // Each side combines the OTHER's public value with their OWN private key.
  const aliceShared = fastPowMod(bobPublic, alicePrivate, p);
  const bobShared = fastPowMod(alicePublic, bobPrivate, p);

  console.assert(aliceShared === bobShared, "Key agreement failed");
  console.log(`Shared secret agreed in public: ${aliceShared}`);
}

diffieHellmanDemo(23n, 5n);
