// HyperLogLog: estimate the number of unique items in a massive stream
// using only a few kilobytes of memory.

const crypto = require("crypto");

class HyperLogLog {
    constructor(precision = 12) {
        // precision controls memory (2^precision registers) vs accuracy
        this.precision = precision;
        this.numRegisters = 1 << precision;
        this.registers = new Uint8Array(this.numRegisters);
        // bias-correction constant, standard for HLL with many registers
        this.alpha = 0.7213 / (1 + 1.079 / this.numRegisters);
    }

    _hash(item) {
        // 64 bits is plenty to split into a bucket index + a rank estimator
        const digest = crypto.createHash("sha1").update(item).digest();
        return digest.readBigUInt64BE(0);
    }

    add(item) {
        const h = this._hash(item);
        const bucket = Number(h >> BigInt(64 - this.precision));
        const remainingBits = 64 - this.precision;
        const mask = (1n << BigInt(remainingBits)) - 1n;
        const remaining = h & mask;

        // rank = 1 + position of the leftmost 1 bit ("how rare was this hash")
        let rank = 1;
        for (let i = remainingBits - 1; i >= 0; i--) {
            if ((remaining >> BigInt(i)) & 1n) break;
            rank++;
        }

        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        // harmonic mean of 2^register smooths out lucky/unlucky buckets
        let sum = 0;
        for (const r of this.registers) sum += 2 ** -r;
        const rawEstimate = (this.alpha * this.numRegisters ** 2) / sum;
        return Math.round(rawEstimate);
    }
}

const hll = new HyperLogLog(12); // 4096 registers, ~4 KB total

const uniqueUsers = new Set();
for (let i = 0; i < 1_000_000; i++) uniqueUsers.add(`user_${i}`);
for (const user of uniqueUsers) hll.add(user);

const actual = uniqueUsers.size;
const estimate = hll.count();
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual unique users:   ${actual.toLocaleString()}`);
console.log(`HyperLogLog estimate:  ${estimate.toLocaleString()}`);
console.log(`Error:                 ${error.toFixed(2)}%`);

module.exports = HyperLogLog;
