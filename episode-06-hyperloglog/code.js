/**
 * HyperLogLog: estimate the number of distinct items in a stream
 * using a fixed, tiny amount of memory (no matter how big the stream is).
 */

const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 4) {
    this.b = b;
    this.m = 1 << b; // number of buckets
    this.registers = new Array(this.m).fill(0);
    this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
  }

  _hashBits(item) {
    const digest = crypto.createHash("md5").update(String(item)).digest();
    const h = digest.readUInt32BE(0);
    return h.toString(2).padStart(32, "0");
  }

  add(item) {
    const bits = this._hashBits(item);
    const bucket = parseInt(bits.slice(0, this.b), 2);
    const rest = bits.slice(this.b);
    const firstOne = rest.indexOf("1");
    const rank = firstOne === -1 ? rest.length + 1 : firstOne + 1;
    this.registers[bucket] = Math.max(this.registers[bucket], rank);
  }

  count() {
    const sum = this.registers.reduce((acc, r) => acc + Math.pow(2, -r), 0);
    const estimate = (this.alpha * this.m * this.m) / sum;
    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(4);
const users = Array.from({ length: 50000 }, (_, i) => `user_${i % 5000}`); // 5,000 unique

users.forEach((u) => hll.add(u));

console.log("True distinct count:", new Set(users).size);
console.log("HyperLogLog estimate:", hll.count());
