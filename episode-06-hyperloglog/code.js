// HyperLogLog: estimate the number of *distinct* items in a huge stream
// using a fixed, tiny amount of memory instead of storing every item seen.

const crypto = require("crypto");

function hash32(value) {
    const digest = crypto.createHash("md5").update(String(value)).digest("hex");
    return parseInt(digest.slice(0, 8), 16) >>> 0;
}

// Position of the leftmost 1-bit in `bits` (a `width`-bit number), 1-indexed.
// A long run of leading zeros is a rare event -- rarer runs imply more
// distinct inputs were needed to produce one.
function rank(bits, width) {
    const binary = bits.toString(2).padStart(width, "0");
    const firstOne = binary.indexOf("1");
    return (firstOne === -1 ? width : firstOne) + 1;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;                 // bits used to pick a bucket
        this.m = 1 << precision;            // number of buckets (registers)
        this.registers = new Array(this.m).fill(0);
        // Bias-correction constant from the original HyperLogLog paper.
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    add(value) {
        const x = hash32(value);
        const bucket = x >>> (32 - this.p);                    // top p bits -> which bucket
        const remainder = x & ((1 << (32 - this.p)) - 1);       // rest of the bits
        const r = rank(remainder, 32 - this.p);
        this.registers[bucket] = Math.max(this.registers[bucket], r);
    }

    count() {
        const harmonicMean = this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);
        return Math.round((this.alpha * this.m * this.m) / harmonicMean);
    }
}

const hll = new HyperLogLog(10); // 1024 registers, ~1 KB of memory total

const stream = [];
for (let i = 0; i < 1_000_000; i++) {
    stream.push(Math.floor(Math.random() * 200_000) + 1);
}
stream.forEach((item) => hll.add(item));

console.log("Estimated distinct:", hll.count());
console.log("Actual distinct:   ", new Set(stream).size);
