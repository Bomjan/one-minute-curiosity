const crypto = require("crypto");

class HyperLogLog {
  constructor(errorRate = 0.02) {
    this.b = Math.max(4, Math.ceil(Math.log2((1.04 / errorRate) ** 2)));
    this.m = 1 << this.b;
    this.registers = new Uint8Array(this.m);
    this.alpha = this.#alpha(this.m);
  }

  #alpha(m) {
    if (m === 16) return 0.673;
    if (m === 32) return 0.697;
    if (m === 64) return 0.709;
    return 0.7213 / (1 + 1.079 / m);
  }

  #hash(item) {
    return BigInt("0x" + crypto.createHash("sha256").update(item).digest("hex"));
  }

  #leadingZeros(bits, maxBits) {
    if (bits === 0n) return maxBits + 1;
    let count = 1;
    const top = 1n << BigInt(maxBits - 1);
    while ((bits & top) === 0n) {
      bits <<= 1n;
      count++;
    }
    return count;
  }

  add(item) {
    const h = this.#hash(item);
    const idx = Number(h >> BigInt(256 - this.b));
    const remaining = (h << BigInt(this.b)) & ((1n << 256n) - 1n);
    const leading = this.#leadingZeros(remaining, 256 - this.b);
    this.registers[idx] = Math.max(this.registers[idx], leading);
  }

  count() {
    const raw =
      this.alpha *
      this.m ** 2 *
      (this.registers.reduce((sum, r) => sum + 2 ** -r, 0) ** -1);

    // Small range correction
    if (raw <= 2.5 * this.m) {
      const zeros = this.registers.filter((r) => r === 0).length;
      if (zeros > 0) return Math.round(this.m * Math.log(this.m / zeros));
    }

    return Math.round(raw);
  }

  toString() {
    const errorApprox = ((1.04 / Math.sqrt(this.m)) * 100).toFixed(1);
    return `HyperLogLog(registers=${this.m}, error≈${errorApprox}%, memory=${this.m} bytes)`;
  }
}

const hll = new HyperLogLog(0.02);
console.log(hll.toString());

const nDistinct = 100_000;
for (let i = 0; i < nDistinct; i++) hll.add(`user_${i}`);

// Duplicates — shouldn't change the estimate
for (let i = 0; i < 10_000; i++) hll.add(`user_${Math.floor(Math.random() * nDistinct)}`);

const estimate = hll.count();
const error = ((Math.abs(estimate - nDistinct) / nDistinct) * 100).toFixed(2);
console.log(`True distinct: ${nDistinct.toLocaleString()}`);
console.log(`HLL estimate:  ${estimate.toLocaleString()}`);
console.log(`Error:         ${error}%`);
