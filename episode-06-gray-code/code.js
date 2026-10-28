// Each neighbour differs by exactly one bit.
const grayCode = (n) => Array.from({ length: 1 << n }, (_, i) => i ^ (i >> 1));

// Decode a Gray code back to a plain binary number.
function fromGray(g) {
  let n = 0;
  for (; g; g >>= 1) n ^= g;
  return n;
}

const codes = grayCode(3);
console.log(codes.map((c) => c.toString(2).padStart(3, "0")));
// [ '000', '001', '011', '010', '110', '111', '101', '100' ]
console.assert(codes.every((c, i) => fromGray(c) === i));
