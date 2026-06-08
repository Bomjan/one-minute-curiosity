const crypto = require("crypto");

class CountMinSketch {
  constructor(epsilon = 0.01, delta = 0.01) {
    this.w = Math.ceil(Math.E / epsilon);
    this.d = Math.ceil(Math.log(1 / delta));
    this.table = Array.from({ length: this.d }, () => new Int32Array(this.w));
    this.total = 0;
  }

  _hash(item, row) {
    const digest = crypto.createHash("md5").update(`${row}:${item}`).digest("hex");
    return Number(BigInt("0x" + digest) % BigInt(this.w));
  }

  update(item, count = 1) {
    this.total += count;
    for (let row = 0; row < this.d; row++) {
      this.table[row][this._hash(item, row)] += count;
    }
  }

  query(item) {
    return Math.min(
      ...Array.from({ length: this.d }, (_, row) => this.table[row][this._hash(item, row)])
    );
  }

  toString() {
    return `CountMinSketch(w=${this.w}, d=${this.d}, cells=${this.w * this.d}, total=${this.total})`;
  }
}

const cms = new CountMinSketch(0.01, 0.01);
console.log(cms.toString());

const stream = [
  ...Array(500).fill("#WorldCup"),
  ...Array(200).fill("#AI"),
  ...Array(80).fill("#Python"),
  ...Array(15).fill("#Rust"),
];

stream.forEach((token) => cms.update(token));

console.log("#WorldCup →", cms.query("#WorldCup")); // ~500
console.log("#AI       →", cms.query("#AI"));       // ~200
console.log("#Python   →", cms.query("#Python"));   // ~80
console.log("#Rust     →", cms.query("#Rust"));     // ~15
console.log("#Java     →", cms.query("#Java"));     // ~0
