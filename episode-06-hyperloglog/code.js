const crypto = require("crypto");

function hash32(item) {
    // A cryptographic hash gives us near-perfect bit independence,
    // which HyperLogLog depends on to stay unbiased.
    const digest = crypto.createHash("sha1").update(String(item)).digest();
    return digest.readUInt32BE(0);
}

function rho(w, maxBits) {
    // Position of the leftmost 1-bit in w (1-indexed).
    if (w === 0) return maxBits + 1;
    let rank = 1;
    let mask = 1 << (maxBits - 1);
    while ((w & mask) === 0) {
        rank++;
        mask >>>= 1;
    }
    return rank;
}

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;                    // bits used to pick a bucket
        this.m = 1 << b;               // number of buckets (registers)
        this.registers = new Array(this.m).fill(0);
        this.remainingBits = 32 - b;
    }

    add(item) {
        const h = hash32(item);
        const index = h >>> this.remainingBits;              // top b bits -> bucket
        const w = h & ((1 << this.remainingBits) - 1);        // rest -> rank source
        const rank = rho(w, this.remainingBits);
        this.registers[index] = Math.max(this.registers[index], rank);
    }

    _alpha() {
        if (this.m === 16) return 0.673;
        if (this.m === 32) return 0.697;
        if (this.m === 64) return 0.709;
        return 0.7213 / (1 + 1.079 / this.m);
    }

    count() {
        const alpha = this._alpha();
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (alpha * this.m * this.m) / sum;

        // Small-cardinality correction: if most buckets are still empty,
        // linear counting is more accurate than the harmonic-mean estimate.
        const zeros = this.registers.filter((r) => r === 0).length;
        if (raw <= 2.5 * this.m && zeros > 0) {
            return Math.round(this.m * Math.log(this.m / zeros));
        }
        return Math.round(raw);
    }
}

// Demo
const hll = new HyperLogLog(10); // 1024 registers, ~1KB of state

const trueSet = new Set();
for (let i = 0; i < 50_000; i++) {
    const value = `user-${i % 20_000}`; // 20,000 distinct visitors, repeated
    hll.add(value);
    trueSet.add(value);
}

const estimate = hll.count();
const actual = trueSet.size;
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual distinct count: ${actual}`);
console.log(`HyperLogLog estimate:  ${estimate}`);
console.log(`Error: ${error.toFixed(2)}%`);
console.log(`Memory used: ${hll.m} registers (a handful of bytes each)`);
