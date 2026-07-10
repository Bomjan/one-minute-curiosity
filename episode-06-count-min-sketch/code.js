// Count-Min Sketch: estimate how often items occur in a huge stream
// using a small, fixed amount of memory instead of one counter per item.
const crypto = require('crypto');

class CountMinSketch {
    constructor(width = 2000, depth = 5) {
        this.width = width;
        this.depth = depth;
        this.table = Array.from({ length: depth }, () => new Array(width).fill(0));
    }

    _hash(item, row) {
        // A different "row" acts as a different, independent hash function.
        const digest = crypto.createHash('md5').update(`${row}:${item}`).digest('hex');
        return Number(BigInt(`0x${digest}`) % BigInt(this.width));
    }

    add(item, count = 1) {
        for (let row = 0; row < this.depth; row++) {
            const idx = this._hash(item, row);
            this.table[row][idx] += count;
        }
    }

    estimate(item) {
        // Collisions can only inflate a counter, never deflate it,
        // so the smallest counter across rows is the tightest estimate.
        let min = Infinity;
        for (let row = 0; row < this.depth; row++) {
            min = Math.min(min, this.table[row][this._hash(item, row)]);
        }
        return min;
    }
}

const cms = new CountMinSketch(2000, 5);

const traffic = [
    ...Array(9000).fill('203.0.113.5'),  // a DDoS-scale attacker
    ...Array(40).fill('198.51.100.7'),   // a normal, chatty client
    ...Array(12).fill('192.0.2.9'),      // a quiet client
];

for (const ip of traffic) cms.add(ip);

for (const ip of ['203.0.113.5', '198.51.100.7', '192.0.2.9', '10.0.0.1']) {
    console.log(`${ip}: estimated ${cms.estimate(ip)} requests`);
}
