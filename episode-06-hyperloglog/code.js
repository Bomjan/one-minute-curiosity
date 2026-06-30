const crypto = require("crypto");

const HASH_BITS = 128; // an MD5 digest is 128 bits wide

class HyperLogLog {
    constructor(numBuckets = 16) {
        this.m = numBuckets;
        this.bucketBits = Math.log2(numBuckets); // m must be a power of 2
        this.valueBits = HASH_BITS - this.bucketBits;
        this.registers = new Array(numBuckets).fill(0);
    }

    _hash(item) {
        const digest = crypto.createHash("md5").update(String(item)).digest("hex");
        return BigInt("0x" + digest);
    }

    _bitLength(value) {
        let length = 0;
        while (value > 0n) {
            value >>= 1n;
            length++;
        }
        return length;
    }

    add(item) {
        const h = this._hash(item);
        const bucket = Number(h & BigInt(this.m - 1));   // low bits pick the bucket
        const rest = h >> BigInt(this.bucketBits);        // remaining valueBits-wide number
        const leadingZeros = this.valueBits - this._bitLength(rest);
        const rank = leadingZeros + 1;
        this.registers[bucket] = Math.max(this.registers[bucket], rank);
    }

    estimate() {
        const alpha = 0.7213 / (1 + 1.079 / this.m);
        const sum = this.registers.reduce((acc, r) => acc + 2 ** -r, 0);
        return Math.round((alpha * this.m ** 2) / sum);
    }
}

const hll = new HyperLogLog(64);
const trueUnique = new Set();

for (let i = 0; i < 50000; i++) {
    const visitor = `user-${i % 12000}`;  // only 12,000 truly unique
    hll.add(visitor);
    trueUnique.add(visitor);
}

console.log("Exact count: ", trueUnique.size);
console.log("HLL estimate:", hll.estimate());
