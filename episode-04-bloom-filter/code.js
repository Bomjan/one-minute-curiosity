const crypto = require("crypto");

class BloomFilter {
    constructor(capacity, errorRate = 0.01) {
        this.size = Math.ceil(
            (-capacity * Math.log(errorRate)) / Math.log(2) ** 2
        );
        this.hashCount = Math.max(
            1,
            Math.round((this.size / capacity) * Math.log(2))
        );
        this.bits = new Uint8Array(this.size);
    }

    _hashes(item) {
        return Array.from({ length: this.hashCount }, (_, i) => {
            const hash = crypto
                .createHash("md5")
                .update(item + String(i))
                .digest("hex");
            return parseInt(hash.slice(0, 8), 16) % this.size;
        });
    }

    add(item) {
        this._hashes(item).forEach((idx) => (this.bits[idx] = 1));
    }

    has(item) {
        return this._hashes(item).every((idx) => this.bits[idx] === 1);
    }
}

const bf = new BloomFilter(1_000_000, 0.01);

["google.com", "github.com", "stackoverflow.com"].forEach((url) =>
    bf.add(url)
);

console.log(bf.has("google.com"));         // true
console.log(bf.has("amazon.com"));         // false — definitely not visited
console.log(bf.has("stackoverflow.com"));  // true

const falsePositives = Array.from(
    { length: 10_000 },
    (_, i) => bf.has(`fake-url-${i}.com`)
).filter(Boolean).length;

console.log(`False positive rate: ${(falsePositives / 10_000 * 100).toFixed(2)}%`);
console.log(`Bit array size: ${bf.size.toLocaleString()} bits (${(bf.size / 8 / 1024).toFixed(1)} KB)`);
console.log(`Hash functions: ${bf.hashCount}`);
