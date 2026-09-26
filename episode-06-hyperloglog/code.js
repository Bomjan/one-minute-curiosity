const crypto = require('crypto');

class HyperLogLog {
    // Estimates the number of DISTINCT items in a huge stream using tiny memory.
    constructor(precision = 10) {
        this.p = precision;                // number of bits used to pick a register
        this.m = 1 << precision;           // number of registers (e.g. 1024)
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m); // bias-correction constant
    }

    _hash(value) {
        const hex = crypto.createHash('sha256').update(String(value)).digest('hex');
        return BigInt('0x' + hex);
    }

    _leadingZeros(w, maxBits) {
        if (w === 0n) return maxBits;
        let count = 0;
        let bit = BigInt(maxBits - 1);
        while (bit >= 0n && ((w >> bit) & 1n) === 0n) {
            count++;
            bit--;
        }
        return count;
    }

    add(value) {
        const x = this._hash(value);
        const bucket = Number(x & BigInt(this.m - 1)); // first p bits -> which register
        const w = x >> BigInt(this.p);                 // remaining bits -> measure rarity
        const rank = this._leadingZeros(w, 256 - this.p) + 1; // position of first 1-bit
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        const z = this.registers.reduce((sum, r) => sum + Math.pow(2, -r), 0);
        let estimate = (this.alpha * this.m * this.m) / z;

        // Small-cardinality correction: raw HLL is biased when most
        // registers are still empty, so fall back to linear counting.
        const zeros = this.registers.filter(r => r === 0).length;
        if (estimate <= 2.5 * this.m && zeros > 0) {
            estimate = this.m * Math.log(this.m / zeros);
        }

        return Math.round(estimate);
    }
}


const hll = new HyperLogLog(10); // 1024 registers, ~4KB
const trueUnique = 100_000;

for (let i = 0; i < trueUnique; i++) {
    hll.add(`user-${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - trueUnique) / trueUnique) * 100;

console.log(`True unique count:      ${trueUnique.toLocaleString()}`);
console.log(`HyperLogLog estimate:   ${estimate.toLocaleString()}`);
console.log(`Error:                  ${error.toFixed(2)}%`);
console.log(`Memory used:            ${hll.m} registers (~${hll.m} bytes)`);
