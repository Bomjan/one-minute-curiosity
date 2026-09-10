/**
 * Diffie-Hellman Key Exchange
 * Two parties agree on a shared secret over a public channel,
 * without ever transmitting the secret itself.
 */

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
    // Public parameters (safe to shout across the room)
    const p = 23n;
    const g = 5n;

    // Private secrets (never transmitted, known only to their owner)
    const aliceSecret = 6n;
    const bobSecret = 15n;

    // Public values exchanged over the "insecure" channel
    const alicePublic = modPow(g, aliceSecret, p);
    const bobPublic = modPow(g, bobSecret, p);

    // Each side combines the other's public value with their own secret.
    // Modular exponentiation makes both sides land on the same number.
    const aliceShared = modPow(bobPublic, aliceSecret, p);
    const bobShared = modPow(alicePublic, bobSecret, p);

    if (aliceShared !== bobShared) {
        throw new Error("Key exchange failed!");
    }

    return { alicePublic, bobPublic, secret: aliceShared };
}

const { alicePublic, bobPublic, secret } = diffieHellmanDemo();

console.log(`Alice's public value (seen by Eve): ${alicePublic}`);
console.log(`Bob's public value   (seen by Eve): ${bobPublic}`);
console.log(`Shared secret (never sent, never seen by Eve): ${secret}`);
