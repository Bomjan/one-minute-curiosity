/**
 * The Timing Attack: why `==` is the wrong way to compare secrets.
 *
 * A naive comparison stops at the first mismatched character, so it runs
 * faster for wrong guesses and slower the closer a guess gets to the real
 * secret. An attacker who can measure response time can exploit that gap
 * to recover a secret one character at a time.
 *
 * The fix: always touch every byte, no matter what.
 */

const crypto = require("crypto");

// The vulnerable version — stops at the first mismatch.
function naiveCompare(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false; // early exit leaks timing info
    }
    return true;
}

// Always inspects every byte — elapsed time no longer depends on *where* it differs.
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

const secret = "hunter2";

console.log(constantTimeCompare(secret, "hunter2")); // true
console.log(constantTimeCompare(secret, "hunter1")); // false
console.log(constantTimeCompare(secret, "short"));   // false (length mismatch)

// In production, prefer the audited standard library version:
console.log(crypto.timingSafeEqual(Buffer.from(secret), Buffer.from("hunter2"))); // true
