function modPow(base, exponent, modulus) {
    // Fast modular exponentiation: base^exponent mod modulus, in O(log exponent)
    base = BigInt(base) % BigInt(modulus);
    exponent = BigInt(exponent);
    modulus = BigInt(modulus);
    let result = 1n;

    while (exponent > 0n) {
        if (exponent & 1n) result = (result * base) % modulus;  // odd bit -> fold in
        exponent >>= 1n;
        base = (base * base) % modulus;                          // square each round
    }
    return result;
}

function diffieHellmanDemo(p, g, aliceSecret, bobSecret) {
    const alicePublic = modPow(g, aliceSecret, p);
    const bobPublic = modPow(g, bobSecret, p);

    const aliceShared = modPow(bobPublic, aliceSecret, p);
    const bobShared = modPow(alicePublic, bobSecret, p);

    if (aliceShared !== bobShared) throw new Error("Key agreement failed");
    return aliceShared;
}

// Textbook-small values for demonstration; real usage needs 2048+ bit primes
const p = 23, g = 5;

console.log(`Shared secret: ${diffieHellmanDemo(p, g, 6, 15)}`); // 2n

// A different pair of secrets still agrees on a shared value
console.log(`Shared secret: ${diffieHellmanDemo(p, g, 4, 13)}`);
