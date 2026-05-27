class FenwickTree {
    constructor(n) {
        this.n = n;
        this.tree = new Array(n + 1).fill(0); // 1-indexed
    }

    update(i, delta) {
        for (; i <= this.n; i += i & (-i))
            this.tree[i] += delta; // move to next responsible ancestor
    }

    prefixSum(i) {
        let total = 0;
        for (; i > 0; i -= i & (-i))
            total += this.tree[i]; // strip lowest set bit, walk toward root
        return total;
    }

    rangeSum(l, r) {
        return this.prefixSum(r) - this.prefixSum(l - 1);
    }
}

const scores = [3, 2, -1, 6, 5, 4];
const ft = new FenwickTree(scores.length);

scores.forEach((val, idx) => ft.update(idx + 1, val));

const tests = [
    ["prefixSum(4)",  ft.prefixSum(4),   10],
    ["rangeSum(3,6)", ft.rangeSum(3, 6), 14],
];

for (const [label, result, expected] of tests) {
    const status = result === expected ? "✓" : "✗";
    console.log(`${status}  ${label} = ${result}`);
}

ft.update(3, 10); // scores[3] += 10

const afterUpdate = ft.prefixSum(4);
const status = afterUpdate === 20 ? "✓" : "✗";
console.log(`${status}  prefixSum(4) after update(3, +10) = ${afterUpdate}`);
