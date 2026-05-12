const crypto = require("crypto");

class BloomFilter {
    constructor(capacity, falsePositiveRate = 0.01) {
        this.n = capacity;
        this.p = falsePositiveRate;
        // Optimal bit array size and number of hash functions
        this.m = Math.ceil((-this.n * Math.log(this.p)) / Math.log(2) ** 2);
        this.k = Math.ceil((this.m / this.n) * Math.log(2));
        this.bits = Buffer.alloc(Math.ceil(this.m / 8));
    }

    _hashPositions(item) {
        const positions = [];
        for (let i = 0; i < this.k; i++) {
            const seed = Buffer.alloc(2);
            seed.writeUInt16BE(i);
            const hash = crypto
                .createHash("sha256")
                .update(item + seed.toString("hex"))
                .digest("hex");
            positions.push(BigInt("0x" + hash) % BigInt(this.m));
        }
        return positions;
    }

    _setBit(pos) {
        const p = Number(pos);
        this.bits[Math.floor(p / 8)] |= 1 << (p % 8);
    }

    _getBit(pos) {
        const p = Number(pos);
        return !!(this.bits[Math.floor(p / 8)] & (1 << (p % 8)));
    }

    add(item) {
        for (const pos of this._hashPositions(item)) {
            this._setBit(pos);
        }
    }

    has(item) {
        return this._hashPositions(item).every((pos) => this._getBit(pos));
    }
}

const bf = new BloomFilter(1000, 0.01);

const knownUrls = ["google.com", "github.com", "python.org", "news.ycombinator.com"];
knownUrls.forEach((url) => bf.add(url));

console.log("=== Membership checks ===");
console.log(`google.com in filter:   ${bf.has("google.com")}`);    // true
console.log(`github.com in filter:   ${bf.has("github.com")}`);    // true
console.log(`bing.com in filter:     ${bf.has("bing.com")}`);      // false
console.log(`facebook.com in filter: ${bf.has("facebook.com")}`);  // false

console.log("\n=== Filter stats ===");
console.log(`Capacity:       ${bf.n} items`);
console.log(`Bit array size: ${bf.m} bits (${Math.ceil(bf.m / 8)} bytes)`);
console.log(`Hash functions: ${bf.k}`);
console.log(`Target FP rate: ${(bf.p * 100).toFixed(1)}%`);

// Empirically measure false-positive rate on random strings
function randomUrl() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const slug = Array.from({ length: 10 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    return `${slug}.com`;
}

const trials = 10_000;
let falsePositives = 0;
for (let i = 0; i < trials; i++) {
    if (bf.has(randomUrl())) falsePositives++;
}

console.log("\n=== Empirical false-positive rate ===");
console.log(`False positives: ${falsePositives}/${trials} (${((falsePositives / trials) * 100).toFixed(2)}%)`);
