const crypto = require("crypto");

function constantTimeCompare(val1, val2) {
    const b1 = Buffer.from(val1);
    const b2 = Buffer.from(val2);

    if (b1.length !== b2.length) {
        crypto.timingSafeEqual(Buffer.alloc(b1.length), Buffer.alloc(b1.length));
        return false;
    }

    return crypto.timingSafeEqual(b1, b2);
}

function constantTimeCompareManual(val1, val2) {
    const b1 = Buffer.from(val1);
    const b2 = Buffer.from(val2);
    const len = Math.max(b1.length, b2.length);
    let result = b1.length ^ b2.length;

    for (let i = 0; i < len; i++) {
        result |= (b1[i] ?? 0) ^ (b2[i] ?? 0);
    }

    return result === 0;
}

const SECRET = process.env.SECRET_TOKEN ?? "super-secret-key-42";

const tests = [
    ["super-secret-key-42",        true],
    ["super-secret-key-43",        false],
    ["wrong",                      false],
    ["",                           false],
    ["super-secret-key-42\x00",   false],
];

console.log("=== crypto.timingSafeEqual ===");
for (const [token, expected] of tests) {
    const result = constantTimeCompare(SECRET, token);
    const status = result === expected ? "✓" : "✗";
    console.log(`  ${status}  ${JSON.stringify(token.slice(0, 30))}  →  ${result}`);
}

console.log("\n=== manual constant-time ===");
for (const [token, expected] of tests) {
    const result = constantTimeCompareManual(SECRET, token);
    const status = result === expected ? "✓" : "✗";
    console.log(`  ${status}  ${JSON.stringify(token.slice(0, 30))}  →  ${result}`);
}
