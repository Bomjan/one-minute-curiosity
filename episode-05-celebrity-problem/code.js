function findCelebrity(n, knows) {
    // Elimination phase: narrow down to one candidate
    let candidate = 0;
    for (let i = 1; i < n; i++) {
        if (knows(candidate, i)) candidate = i;
    }

    // Verification phase: confirm the candidate is a true celebrity
    for (let i = 0; i < n; i++) {
        if (i === candidate) continue;
        if (knows(candidate, i) || !knows(i, candidate)) return -1;
    }

    return candidate;
}


// Test 1: Person 3 is the celebrity
const matrix = [
    [false, true,  true,  true],
    [false, false, true,  true],
    [false, false, false, true],
    [false, false, false, false],
];

const knows = (a, b) => matrix[a][b];

console.log(`Celebrity: ${findCelebrity(4, knows)}`);  // 3

// Test 2: No celebrity (circular knowing)
const matrix2 = [
    [false, true,  false],
    [false, false, true],
    [true,  false, false],
];

const knows2 = (a, b) => matrix2[a][b];

console.log(`Celebrity: ${findCelebrity(3, knows2)}`);  // -1

// Test 3: Single person (trivially a celebrity)
const knows3 = () => false;

console.log(`Celebrity: ${findCelebrity(1, knows3)}`);  // 0
