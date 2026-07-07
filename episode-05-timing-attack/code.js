const crypto = require("crypto");

const SECRET_TOKEN = process.env.API_TOKEN ?? "sk-super-secret-value";

function safeCompare(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // timingSafeEqual requires equal-length buffers.
    // If lengths differ, still run a dummy comparison to avoid
    // leaking length information via response time.
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

function unsafeCompare(a, b) {
    return a === b; // vulnerable: exits on first mismatch
}

function verifyRequest(userToken) {
    return safeCompare(userToken, SECRET_TOKEN);
}

function measureNs(fn, iterations = 500_000) {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) fn();
    return Number(process.hrtime.bigint() - start) / iterations;
}

function demonstrateTimingLeak() {
    const secret = "SECRETKEY";

    const noMatch  = measureNs(() => unsafeCompare("XXXXXXXXX", secret));
    const oneMatch = measureNs(() => unsafeCompare("SXXXXXXXX", secret));

    console.log("=== Unsafe comparison (vulnerable) ===");
    console.log(`No chars match  : ${noMatch.toFixed(2)} ns/call`);
    console.log(`First char match: ${oneMatch.toFixed(2)} ns/call`);
    console.log(`Difference      : ${(oneMatch - noMatch).toFixed(2)} ns  ← timing leak`);
    console.log();

    const noMatchSafe  = measureNs(() => safeCompare("XXXXXXXXX", secret));
    const oneMatchSafe = measureNs(() => safeCompare("SXXXXXXXX", secret));

    console.log("=== Safe comparison (constant-time) ===");
    console.log(`No chars match  : ${noMatchSafe.toFixed(2)} ns/call`);
    console.log(`First char match: ${oneMatchSafe.toFixed(2)} ns/call`);
    console.log(`Difference      : ${(oneMatchSafe - noMatchSafe).toFixed(2)} ns`);
}

// Correctness
console.log("=== Correctness ===");
console.log(safeCompare("hello", "hello"));  // true
console.log(safeCompare("hello", "hellx"));  // false
console.log(safeCompare("abc", "xyz"));      // false
console.log();

// Token verification
console.log("=== Token Verification ===");
console.log(verifyRequest("sk-super-secret-value")); // true
console.log(verifyRequest("sk-wrong-value"));         // false
console.log();

// Timing leak demo
console.log("=== Timing Leak Demo ===");
demonstrateTimingLeak();
