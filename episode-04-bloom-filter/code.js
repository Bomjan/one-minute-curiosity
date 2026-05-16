class BloomFilter {
    constructor(nItems, falsePosRate = 0.01) {
        this.size = this._optimalSize(nItems, falsePosRate);
        this.hashCount = this._optimalHashes(this.size, nItems);
        this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    }

    _optimalSize(n, p) {
        return Math.ceil(-n * Math.log(p) / Math.log(2) ** 2);
    }

    _optimalHashes(m, n) {
        return Math.max(1, Math.round((m / n) * Math.log(2)));
    }

    // FNV-1a variant seeded with the hash number
    _hash(str, seed) {
        let h = 0x811c9dc5 ^ seed;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return Math.abs(h) % this.size;
    }

    _positions(item) {
        return Array.from({ length: this.hashCount }, (_, i) => this._hash(item, i));
    }

    add(item) {
        for (const pos of this._positions(item)) {
            this.bitArray[Math.floor(pos / 8)] |= 1 << (pos % 8);
        }
    }

    contains(item) {
        return this._positions(item).every(pos =>
            (this.bitArray[Math.floor(pos / 8)] >> (pos % 8)) & 1
        );
    }
}

const bf = new BloomFilter(1_000_000, 0.01);

["google.com", "github.com", "anthropic.com"].forEach(url => bf.add(url));

console.log(bf.contains("google.com"));    // true  ✅
console.log(bf.contains("reddit.com"));    // false ✅
console.log(bf.contains("github.com"));    // true  ✅

console.log(`Filter size: ${(bf.bitArray.length / 1024).toFixed(1)} KB for 1M items`);
console.log(`Hash functions used: ${bf.hashCount}`);
