function findDuplicate(nums) {
    let slow = nums[0];
    let fast = nums[0];

    // Phase 1: find meeting point inside the cycle
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);

    // Phase 2: find cycle entry = duplicate
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }

    return slow;
}

const testCases = [
    { nums: [1, 3, 4, 2, 2], expected: 2 },
    { nums: [3, 1, 3, 4, 2], expected: 3 },
    { nums: [2, 2, 2, 2, 2], expected: 2 },
    { nums: [1, 1],          expected: 1 },
];

for (const { nums, expected } of testCases) {
    const result = findDuplicate(nums);
    const status = result === expected ? "✓" : "✗";
    console.log(`${status}  [${nums}]  →  ${result}`);
}
