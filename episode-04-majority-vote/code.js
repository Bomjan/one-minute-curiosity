function majorityVote(nums) {
    let candidate = null;
    let count = 0;

    for (const num of nums) {
        if (count === 0) candidate = num;
        count += num === candidate ? 1 : -1;
    }

    return candidate;
}

const testCases = [
    { input: [2, 2, 1, 1, 1, 2, 2], expected: 2 },
    { input: [3, 2, 3],               expected: 3 },
    { input: [1],                     expected: 1 },
    { input: [6, 6, 6, 7, 7],         expected: 6 },
];

for (const { input, expected } of testCases) {
    const result = majorityVote(input);
    const status = result === expected ? "✓" : "✗";
    console.log(`${status}  majorityVote([${input}]) = ${result}`);
}
