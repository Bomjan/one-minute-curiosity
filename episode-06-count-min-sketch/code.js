class CountMinSketch {
    // A fixed-size grid of counters that estimates how often an item
    // was seen, without ever storing the items themselves.
    constructor(width = 200, depth = 5) {
        this.width = width;
        this.depth = depth;
        this.table = Array.from({ length: depth }, () => new Array(width).fill(0));
    }

    _hash(item, seed) {
        // A different seed per row spreads collisions across independent hashes
        let h = seed;
        const str = String(item);
        for (let i = 0; i < str.length; i++) {
            h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
        }
        return h % this.width;
    }

    add(item, count = 1) {
        for (let row = 0; row < this.depth; row++) {
            const col = this._hash(item, row);
            this.table[row][col] += count;
        }
    }

    estimate(item) {
        // A collision can only ever inflate a row's counter, never deflate it,
        // so the smallest row is always the closest we can get to the truth.
        let best = Infinity;
        for (let row = 0; row < this.depth; row++) {
            best = Math.min(best, this.table[row][this._hash(item, row)]);
        }
        return best;
    }
}


const sketch = new CountMinSketch(50, 4);

const events = [
    ...Array(120).fill("login"),
    ...Array(45).fill("click"),
    ...Array(8).fill("purchase"),
    ...Array(60).fill("logout"),
];
events.forEach((event) => sketch.add(event));

["login", "click", "purchase", "logout", "refund"].forEach((event) => {
    console.log(`${event}: ~${sketch.estimate(event)}`);
});
// login: ~120, click: ~45, purchase: ~8, logout: ~60, refund: ~0
