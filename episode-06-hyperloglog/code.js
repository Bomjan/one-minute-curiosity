// HyperLogLog: count distinct items in a stream using a fixed, tiny amount of memory.

const crypto = require("crypto");

class HyperLogLog {
  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b; // number of buckets, e.g. 1024 when b = 10
    this.registers = new Array(this.m).fill(0);
    this.alpha = this.m === 16 ? 0.673 : 0.7213 / (1 + 1.079 / this.m);
  }

  _hashBits(item) {
    const digest = crypto.createHash("sha1").update(String(item)).digest("hex");
    return BigInt("0x" + digest).toString(2).padStart(160, "0");
  }

  add(item) {
    const bits = this._hashBits(item);
    const bucket = parseInt(bits.slice(0, this.b), 2);
    const rest = bits.slice(this.b);
    const firstOne = rest.indexOf("1");
    // rho = position of the first 1-bit (how long the leading-zero streak was)
    const rho = (firstOne === -1 ? rest.length : firstOne) + 1;
    this.registers[bucket] = Math.max(this.registers[bucket], rho);
  }

  count() {
    const indicator = this.registers.reduce((sum, r) => sum + 2 ** -r, 0);
    const estimate = (this.alpha * this.m * this.m) / indicator;
    return Math.round(estimate);
  }
}

const hll = new HyperLogLog(10);
const trueUnique = new Set();

for (let i = 0; i < 100000; i++) {
  const userId = `user-${i % 40000}`; // 40,000 real uniques, lots of repeats
  hll.add(userId);
  trueUnique.add(userId);
}

console.log("Actual unique:", trueUnique.size);
console.log("HLL estimate :", hll.count());
