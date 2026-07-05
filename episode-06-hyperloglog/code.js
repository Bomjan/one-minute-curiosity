// Episode 06: HyperLogLog
// Estimate how many DISTINCT items passed through a stream using
// a fixed, tiny amount of memory — no matter how large the stream gets.

const crypto = require("crypto");

function hash(item) {
    // Stable 32-bit hash so every run behaves the same way
    const digest = crypto.createHash("md5").update(String(item)).digest("hex");
    return parseInt(digest.slice(0, 8), 16);
}

function leadingZeroRun(bits, width) {
    // Count leading zeros in `bits` (as a `width`-bit binary string), +1
    const binary = bits.toString(2).padStart(width, "0");
    const trimmed = binary.replace(/^0+/, "");
    return binary.length - trimmed.length + 1;
}

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;                      // number of bits used to pick a bucket
        this.m = 1 << b;                 // number of buckets, e.g. 1024
        this.buckets = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    add(item) {
        const x = hash(item);
        const bucketIndex = x & (this.m - 1);   // last `b` bits choose the bucket
        const remainingBits = x >>> this.b;
        const rank = leadingZeroRun(remainingBits, 32 - this.b);
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], rank);
    }

    count() {
        const sumInverse = this.buckets.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (this.alpha * this.m * this.m) / sumInverse;
        return Math.round(raw);
    }
}

// Demo
const hll = new HyperLogLog(10); // 1024 buckets, ~1KB of memory
const trueUnique = new Set();

for (let i = 0; i < 1_000_000; i++) {
    const value = i % 50_000; // only 50,000 truly distinct values
    hll.add(value);
    trueUnique.add(value);
}

console.log("True distinct count:", trueUnique.size);
console.log("HyperLogLog estimate:", hll.count());
