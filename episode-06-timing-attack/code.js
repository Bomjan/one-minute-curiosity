const crypto = require("crypto");

function insecureEquals(a, b) {
  // What most people write by hand — leaks timing info via early exit.
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false; // early exit = the vulnerability
  }
  return true;
}

function constantTimeEquals(a, b) {
  // Every byte is inspected, every time. No early exit, no timing leak.
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const secret = "S3cr3t!";

console.log(insecureEquals(secret, "S3cr3t!"));      // true
console.log(constantTimeEquals(secret, "S3cr3t!"));  // true

// In production, don't hand-roll this — use the built-in:
console.log(
  crypto.timingSafeEqual(Buffer.from(secret), Buffer.from("S3cr3t!"))
); // true
