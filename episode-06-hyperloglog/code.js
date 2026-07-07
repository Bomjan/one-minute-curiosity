// Turn any item into a well-mixed 32-bit unsigned integer (djb2 + avalanche finisher).
function hash32(item) {
    const str = String(item);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    // Without this, near-identical inputs (like "user-1", "user-2") land in
    // the same bucket with near-identical remainders, wrecking the estimate.
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;
    return hash >>> 0;
}

// Position of the leftmost 1-bit in a `width`-bit number (1-indexed).
function leadingZeroRun(w, width) {
    for (let i = 0; i < width; i++) {
        if (w & (1 << (width - 1 - i))) return i + 1;
    }
    return width + 1; // all zeros (rare, but possible)
}

class HyperLogLog {
    constructor(b = 8) {
        this.b = b;                                  // bits used to pick a bucket
        this.m = 1 << b;                              // number of buckets (registers)
        this.registers = new Array(this.m).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.m);   // bias-correction constant
    }

    add(item) {
        const x = hash32(item);
        const bucket = x >>> (32 - this.b);                       // top b bits choose the bucket
        const remainder = x & ((1 << (32 - this.b)) - 1);         // the rest is our "coin flips"
        const run = leadingZeroRun(remainder, 32 - this.b);
        this.registers[bucket] = Math.max(this.registers[bucket], run);
    }

    count() {
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (this.alpha * this.m ** 2) / sum;

        const zeroBuckets = this.registers.filter((r) => r === 0).length;
        if (raw <= 2.5 * this.m && zeroBuckets > 0) {
            // Small cardinalities: linear counting is more accurate.
            return Math.round(this.m * Math.log(this.m / zeroBuckets));
        }
        return Math.round(raw);
    }
}

const trueUnique = 100_000;
const hll = new HyperLogLog(8); // 256 registers = 256 bytes of state

for (let i = 0; i < trueUnique; i++) {
    hll.add(`user-${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - trueUnique) / trueUnique) * 100;

console.log(`True unique items: ${trueUnique}`);
console.log(`HyperLogLog estimate: ${estimate}`);
console.log(`Error: ${error.toFixed(2)}%`);
console.log(`Memory used: ${hll.m} registers (~${hll.m} bytes)`);
