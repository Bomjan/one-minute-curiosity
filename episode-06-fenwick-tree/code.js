class FenwickTree {
  constructor(size) {
    this.tree = new Array(size + 1).fill(0); // 1-indexed; slot i covers the last lowbit(i) items
  }

  add(i, delta) {
    for (i += 1; i < this.tree.length; i += i & -i) {
      this.tree[i] += delta; // jump to the next range that contains i
    }
  }

  prefixSum(i) {
    let total = 0;
    for (i += 1; i > 0; i -= i & -i) {
      total += this.tree[i]; // strip the lowest set bit
    }
    return total;
  }

  rangeSum(left, right) {
    return this.prefixSum(right) - (left ? this.prefixSum(left - 1) : 0);
  }
}

const scores = [5, 3, 7, 9, 6, 4, 1, 2];
const ft = new FenwickTree(scores.length);
scores.forEach((s, i) => ft.add(i, s));

console.log(ft.rangeSum(2, 5)); // 26
ft.add(3, 10);                  // the 9 becomes 19
console.log(ft.rangeSum(2, 5)); // 36
console.log(ft.prefixSum(7));   // 47
