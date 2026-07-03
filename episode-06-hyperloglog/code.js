const crypto = require("crypto");

// Estimate the number of distinct items in a stream using fixed memory.
class HyperLogLog {
    static HASH_BITS = 64; // readBigUInt64BE gives a 64-bit hash

    constructor(numBucketsPow = 10) {
        this.b = numBucketsPow;
        this.m = 2 ** this.b; // number of buckets
        this.buckets = new Uint8Array(this.m);
        this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
    }

    _hash(item) {
        const digest = crypto.createHash("sha256").update(String(item)).digest();
        return digest.readBigUInt64BE(0);
    }

    add(item) {
        const h = this._hash(item);
        const bucketIndex = Number(h & BigInt(this.m - 1)); // last b bits
        const remaining = h >> BigInt(this.b);
        const remainingBits = HyperLogLog.HASH_BITS - this.b;
        const rho = this._leadingZeros(remaining, remainingBits) + 1; // "flips until heads"
        this.buckets[bucketIndex] = Math.max(this.buckets[bucketIndex], rho);
    }

    _leadingZeros(x, bits) {
        if (x === 0n) return bits;
        return bits - x.toString(2).length;
    }

    estimate() {
        const harmonicSum = this.buckets.reduce((sum, b) => sum + 2 ** -b, 0);
        const rawEstimate = (this.alpha * this.m * this.m) / harmonicSum;
        return Math.round(rawEstimate);
    }
}

const hll = new HyperLogLog(10); // 1024 buckets

const uniqueUsers = Array.from({ length: 500_000 }, (_, i) => `user_${i % 50000}`);
for (const u of uniqueUsers) hll.add(u);

console.log("True distinct count: 50000");
console.log(`HyperLogLog estimate: ${hll.estimate()}`);
console.log(`Memory used: ${hll.m} small integers, no matter the stream size`);
