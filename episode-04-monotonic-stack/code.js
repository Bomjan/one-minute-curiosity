function dailyTemperatures(temps) {
    const result = new Array(temps.length).fill(0);
    const stack = [];  // indices of days still waiting for a warmer day

    for (let i = 0; i < temps.length; i++) {
        while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
            const j = stack.pop();
            result[j] = i - j;
        }
        stack.push(i);
    }

    return result;
}

const testCases = [
    { input: [73, 74, 75, 71, 69, 72, 76, 73], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
    { input: [30, 40, 50, 60],                  expected: [1, 1, 1, 0] },
    { input: [60, 50, 40, 30],                  expected: [0, 0, 0, 0] },
    { input: [30, 60, 90, 50, 40, 80, 70, 100], expected: [1, 1, 5, 2, 1, 2, 1, 0] },
];

for (const { input, expected } of testCases) {
    const result = dailyTemperatures(input);
    const pass = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`${pass ? "✓" : "✗"}  [${input}]`);
    console.log(`     got:      [${result}]`);
    console.log(`     expected: [${expected}]\n`);
}
