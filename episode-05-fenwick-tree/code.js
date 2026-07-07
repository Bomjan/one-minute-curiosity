class FenwickTree {
  constructor(n) {
    this.n = n;
    this.tree = new Array(n + 1).fill(0); // 1-indexed
  }

  update(i, delta) {
    while (i <= this.n) {
      this.tree[i] += delta;
      i += i & (-i); // jump to next index responsible for a larger range
    }
  }

  query(i) {
    // Prefix sum from index 1 to i
    let total = 0;
    while (i > 0) {
      total += this.tree[i];
      i -= i & (-i); // strip lowest set bit to move left
    }
    return total;
  }

  rangeQuery(left, right) {
    // Sum of elements from index left to right (1-indexed, inclusive)
    return this.query(right) - this.query(left - 1);
  }

  static fromArray(arr) {
    const ft = new FenwickTree(arr.length);
    arr.forEach((val, idx) => ft.update(idx + 1, val));
    return ft;
  }
}

const arr = [2, 1, 4, 7, 3, 5];
const ft = FenwickTree.fromArray(arr);

console.log(ft.query(4));           // 14  (2+1+4+7)
console.log(ft.rangeQuery(3, 6));   // 19  (4+7+3+5)

ft.update(3, 2);                    // arr[3] goes from 4 to 6

console.log(ft.query(4));           // 16  (2+1+6+7)
console.log(ft.rangeQuery(3, 6));   // 21  (6+7+3+5)
