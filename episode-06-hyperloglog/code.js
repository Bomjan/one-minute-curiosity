// HyperLogLog: estimate the number of *distinct* items in a huge stream
// using a fixed, tiny amount of memory (a handful of small counters).

const crypto = require("crypto");

class HyperLogLog {
    constructor(numBucketBits = 4) {
        this.b = numBucketBits;
        this.m = 1 << this.b; // number of buckets, e.g. 16
        this.registers = new Array(this.m).fill(0);
        this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("md5").update(String(item)).digest("hex");
        return BigInt("0x" + digest); // 128-bit integer
    }

    _leadingZeros(value, bitWidth) {
        if (value === 0n) return bitWidth;
        let count = 0;
        for (let i = bitWidth - 1; i >= 0; i--) {
            if ((value >> BigInt(i)) & 1n) break;
            count++;
        }
        return count;
    }

    add(item) {
        const x = this._hash(item);
        const bucketIndex = Number(x & BigInt(this.m - 1)); // last b bits pick the bucket
        const remainder = x >> BigInt(this.b); // the rest of the bits
        const runLength = this._leadingZeros(remainder, 128 - this.b) + 1;
        this.registers[bucketIndex] = Math.max(this.registers[bucketIndex], runLength);
    }

    estimate() {
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        const raw = (this.alpha * this.m * this.m) / sum;
        return Math.round(raw);
    }
}

const hll = new HyperLogLog(4);

const uniqueItems = Array.from({ length: 10000 }, (_, i) => `user_${i}`);
uniqueItems.forEach((item) => hll.add(item));

// Adding duplicates should barely move the estimate.
uniqueItems.slice(0, 5000).forEach((item) => hll.add(item));

console.log("Actual unique count:", new Set(uniqueItems).size);
console.log("HyperLogLog estimate:", hll.estimate());
