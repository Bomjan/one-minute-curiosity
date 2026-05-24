const crypto = require("crypto");

class BloomFilter {
  constructor(capacity, falsePositiveRate = 0.01) {
    this.capacity = capacity;
    this.fpr = falsePositiveRate;
    this.bitCount = this.#optimalBitCount(capacity, falsePositiveRate);
    this.hashCount = this.#optimalHashCount(this.bitCount, capacity);
    this.bits = new Uint8Array(Math.ceil(this.bitCount / 8));
  }

  #optimalBitCount(n, p) {
    return Math.ceil((-n * Math.log(p)) / Math.log(2) ** 2);
  }

  #optimalHashCount(m, n) {
    return Math.max(1, Math.round((m / n) * Math.log(2)));
  }

  #hashPositions(item) {
    const positions = [];
    for (let seed = 0; seed < this.hashCount; seed++) {
      const hash = crypto
        .createHash("sha256")
        .update(`${seed}:${item}`)
        .digest("hex");
      const pos = BigInt("0x" + hash) % BigInt(this.bitCount);
      positions.push(Number(pos));
    }
    return positions;
  }

  add(item) {
    for (const pos of this.#hashPositions(item)) {
      this.bits[Math.floor(pos / 8)] |= 1 << pos % 8;
    }
  }

  has(item) {
    return this.#hashPositions(item).every(
      (pos) => this.bits[Math.floor(pos / 8)] & (1 << pos % 8)
    );
  }

  toString() {
    return `BloomFilter(capacity=${this.capacity}, fpr=${this.fpr}, bits=${this.bitCount}, hashes=${this.hashCount}, memory=${Math.ceil(this.bitCount / 8 / 1024)} KB)`;
  }
}

const bf = new BloomFilter(1_000_000, 0.01);
console.log(bf.toString());

["alice@x.com", "bob@x.com", "carol@x.com"].forEach((e) => bf.add(e));

console.log("alice@x.com:", bf.has("alice@x.com")); // true
console.log("dave@x.com:", bf.has("dave@x.com"));   // false
console.log("eve@x.com:", bf.has("eve@x.com"));     // false

// Measure empirical false positive rate
const trials = 100_000;
const randomEmail = () => {
  const name = Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26))
  ).join("");
  return `${name}@test.com`;
};

let falsePositives = 0;
for (let i = 0; i < trials; i++) {
  if (bf.has(randomEmail())) falsePositives++;
}
console.log(`\nEmpirical FPR: ${((falsePositives / trials) * 100).toFixed(2)}% (target: 1%)`);
