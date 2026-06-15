// HyperLogLog: estimate the number of *unique* items in a massive stream
// using only a few kilobytes of memory.

const crypto = require("crypto");

class HyperLogLog {
    constructor(b = 10) {
        this.b = b;                 // bits used to pick a bucket
        this.m = 1 << b;            // number of buckets (2^b)
        this.buckets = new Array(this.m).fill(0);
        // bias-correction constant, tuned for the number of buckets
        this.alpha = 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("sha256").update(String(item)).digest("hex");
        return BigInt("0x" + digest);
    }

    _leadingZeros(x, maxBits = 256) {
        if (x === 0n) return maxBits;
        let count = 0;
        let bit = BigInt(maxBits - 1);
        while (bit >= 0n && ((x >> bit) & 1n) === 0n) {
            count++;
            bit--;
        }
        return count;
    }

    add(item) {
        const x = this._hash(item);
        const bucketIndex = Number(x & BigInt(this.m - 1)); // last b bits choose the bucket
        const remainder = x >> BigInt(this.b);              // the rest of the hash
        const run = this._leadingZeros(remainder, 256 - this.b) + 1;
        // keep the longest "run of zeros" ever seen for this bucket
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], run);
    }

    count() {
        const z = this.buckets.reduce((sum, r) => sum + 2 ** -r, 0);
        return Math.round((this.alpha * this.m * this.m) / z);
    }
}

const hll = new HyperLogLog(10); // 1024 buckets
const uniqueItems = new Set();

for (let i = 0; i < 100_000; i++) {
    const item = `user_${i % 50_000}`; // only 50,000 distinct users
    hll.add(item);
    uniqueItems.add(item);
}

const actual = uniqueItems.size;
const estimate = hll.count();
const error = (Math.abs(estimate - actual) / actual) * 100;

console.log(`Actual unique count:   ${actual}`);
console.log(`HyperLogLog estimate:  ${estimate}`);
console.log(`Error:                 ${error.toFixed(2)}%`);
console.log(`Memory: ${hll.m} tiny counters vs. ${actual} stored items`);
