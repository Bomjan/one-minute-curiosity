/**
 * Episode 06: The Password Check That Leaks Its Own Secret
 * A naive `===` on secrets exits early on the first mismatch, letting an
 * attacker recover the secret by measuring response time. Compare in
 * constant time instead: never branch on a single character.
 */

const crypto = require("crypto");

function constantTimeEquals(secret, guess) {
    if (secret.length !== guess.length) return false;

    const a = Buffer.from(secret, "utf8");
    const b = Buffer.from(guess, "utf8");

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i]; // accumulate; never branch on a single mismatch
    }
    return diff === 0;
}

const realKey = "a8f9c2";

// Prefer Node's built-in in real code — it's audited and constant-time.
console.log(crypto.timingSafeEqual(Buffer.from(realKey), Buffer.from("a8f9c2"))); // true

// From-scratch version, to show the mechanism itself:
console.log(constantTimeEquals(realKey, "a8f9c2")); // true
console.log(constantTimeEquals(realKey, "a80000")); // false
