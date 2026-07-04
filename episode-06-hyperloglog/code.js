// Simple 32-bit FNV-1a string hash (no external dependencies needed)
function fnv1aHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // unsigned 32-bit
}

class HyperLogLog {
    constructor(numBucketBits = 10) {
        this.b = numBucketBits;           // bits used to pick a register
        this.m = 1 << numBucketBits;      // number of registers (e.g. 1024)
        this.registers = new Uint8Array(this.m);
    }

    _leadingZeros(w, width) {
        if (w === 0) return width;
        let count = 0;
        let mask = 1 << (width - 1);
        while (mask !== 0 && (w & mask) === 0) {
            count++;
            mask >>>= 1;
        }
        return count;
    }

    add(item) {
        const x = fnv1aHash(String(item));
        const bucket = x & (this.m - 1);   // first b bits -> which register
        const rest = x >>> this.b;         // remaining bits -> the "coin flips"
        const width = 32 - this.b;
        const rank = this._leadingZeros(rest, width) + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        // Harmonic mean of the registers, corrected by a bias constant (alpha)
        const alpha = 0.7213 / (1 + 1.079 / this.m);
        let z = 0;
        for (const r of this.registers) z += Math.pow(2, -r);
        return Math.round((alpha * this.m * this.m) / z);
    }
}

const hll = new HyperLogLog(10); // 1024 registers, ~1KB total

const uniqueItems = Array.from({ length: 100000 }, (_, i) => `user_${i}`);
uniqueItems.forEach((item) => hll.add(item));

const actual = uniqueItems.length;
const estimate = hll.count();
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual unique count:   ${actual}`);
console.log(`HyperLogLog estimate:  ${estimate}`);
console.log(`Error:                 ${error.toFixed(2)}%`);
console.log(`Memory used:           ${hll.m} registers (~1KB)`);
