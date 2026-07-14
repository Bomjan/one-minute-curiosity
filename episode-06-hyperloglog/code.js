// HyperLogLog: count billions of unique items using kilobytes of memory.

function hash32(str) {
    // FNV-1a mixed with a Murmur3-style finalizer for a good bit spread
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

class HyperLogLog {
    constructor(precision = 10) {
        this.p = precision;                 // bits used to pick a register
        this.m = 1 << precision;            // number of registers
        this.registers = new Uint8Array(this.m);
        this.alpha = HyperLogLog._alpha(this.m);
    }

    static _alpha(m) {
        // standard HyperLogLog bias-correction constant
        if (m === 16) return 0.673;
        if (m === 32) return 0.697;
        if (m === 64) return 0.709;
        return 0.7213 / (1 + 1.079 / m);
    }

    _leadingZeroCount(value, bits) {
        if (value === 0) return bits;
        let count = 0;
        for (let mask = 1 << (bits - 1); mask !== 0 && !(value & mask); mask >>>= 1) {
            count++;
        }
        return count;
    }

    add(item) {
        const h = hash32(String(item));
        const bucket = h & (this.m - 1);            // low p bits select the register
        const remaining = h >>> this.p;              // remaining (32 - p) bits
        const rank = this._leadingZeroCount(remaining, 32 - this.p) + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    count() {
        let sum = 0;
        let zeros = 0;
        for (const r of this.registers) {
            sum += Math.pow(2, -r);
            if (r === 0) zeros++;
        }
        const raw = (this.alpha * this.m * this.m) / sum;

        // small-range correction: fall back to linear counting when
        // many registers are still untouched
        if (raw <= 2.5 * this.m && zeros > 0) {
            return Math.round(this.m * Math.log(this.m / zeros));
        }

        return Math.round(raw);
    }
}

const hll = new HyperLogLog(10);
const trueItems = new Set();

for (let i = 0; i < 100000; i++) {
    const value = `user-${i % 40000}`; // only 40,000 truly unique values
    hll.add(value);
    trueItems.add(value);
}

console.log(`Actual unique items:   ${trueItems.size}`);
console.log(`HyperLogLog estimate:  ${hll.count()}`);
console.log(`Memory used:           ${hll.m} registers (~${hll.m} bytes)`);
