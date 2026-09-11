const crypto = require("crypto");

class HyperLogLog {
    constructor(bucketBits = 8) {
        this.bucketBits = bucketBits;
        this.numBuckets = 1 << bucketBits; // 256 buckets by default
        this.buckets = new Array(this.numBuckets).fill(0);
        this.alpha = 0.7213 / (1 + 1.079 / this.numBuckets);
    }

    _hash32(value) {
        const digest = crypto.createHash("sha1").update(String(value)).digest();
        return digest.readUInt32BE(0);
    }

    _leadingZeros(x, bitWidth) {
        if (x === 0) return bitWidth;
        let count = 0;
        let mask = 1 << (bitWidth - 1);
        while (mask && !(x & mask)) {
            count++;
            mask >>>= 1;
        }
        return count;
    }

    add(value) {
        const h = this._hash32(value);
        const bucketIndex = h & (this.numBuckets - 1); // low bits pick the bucket
        const remainingBits = 32 - this.bucketBits;
        const remaining = h >>> this.bucketBits;
        const rank = this._leadingZeros(remaining, remainingBits) + 1;
        if (rank > this.buckets[bucketIndex]) {
            this.buckets[bucketIndex] = rank; // keep only the longest streak
        }
    }

    count() {
        const harmonicSum = this.buckets.reduce((sum, r) => sum + 2 ** -r, 0);
        const estimate = (this.alpha * this.numBuckets ** 2) / harmonicSum;
        return Math.round(estimate);
    }
}

const hll = new HyperLogLog();
const uniqueVisitors = 10_000;

for (let i = 0; i < uniqueVisitors; i++) {
    hll.add(`user_${i}`);
}

// Feed in 5,000 repeats — they must not move the estimate
for (let i = 0; i < 5_000; i++) {
    hll.add(`user_${i}`);
}

const estimate = hll.count();
const error = (Math.abs(estimate - uniqueVisitors) / uniqueVisitors) * 100;

console.log(`Actual unique visitors: ${uniqueVisitors}`);
console.log(`Estimated count:        ${estimate}`);
console.log(`Error:                  ${error.toFixed(2)}%`);
console.log(`Memory used:            ${hll.buckets.length} bytes`);
