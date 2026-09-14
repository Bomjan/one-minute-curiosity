// HyperLogLog: estimate how many unique items passed through a stream,
// using a fixed, tiny amount of memory — no matter how big the stream gets.

const crypto = require('crypto');

function hash(value) {
    // Turn any string into a well-mixed 32-bit integer.
    const digest = crypto.createHash('md5').update(value).digest();
    return digest.readUInt32BE(0);
}

function rho(bits, maxBits) {
    // Position of the leftmost 1-bit (1-indexed). All zeros -> maxBits + 1.
    for (let i = maxBits - 1; i >= 0; i--) {
        if (bits & (1 << i)) return maxBits - i;
    }
    return maxBits + 1;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;
        this.m = 1 << precision; // number of registers, e.g. 1024
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m); // bias-correction constant
    }

    add(item) {
        const h = hash(item) >>> 0;
        const index = h >>> (32 - this.p); // first p bits pick a "bucket"
        const remaining = h & ((1 << (32 - this.p)) - 1);
        const run = rho(remaining, 32 - this.p); // longest run of leading zeros seen
        this.registers[index] = Math.max(this.registers[index], run);
    }

    count() {
        const harmonicMean = this.registers.reduce((sum, reg) => sum + Math.pow(2, -reg), 0);
        const estimate = (this.alpha * this.m * this.m) / harmonicMean;
        return Math.round(estimate);
    }
}

const hll = new HyperLogLog(10); // 1024 registers ≈ 1 KB of memory

const uniqueVisitors = 100000;
for (let i = 0; i < uniqueVisitors; i++) {
    hll.add(`user-${i}`);
}

console.log(`Estimated unique visitors: ${hll.count()}`);
console.log(`Actual unique visitors:    ${uniqueVisitors}`);
