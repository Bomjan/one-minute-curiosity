function nextGreater(nums) {
    const result = new Array(nums.length).fill(-1);
    const stack = []; // stores indices of elements awaiting their answer

    for (let i = 0; i < nums.length; i++) {
        while (stack.length > 0 && nums[stack.at(-1)] < nums[i]) {
            const idx = stack.pop();
            result[idx] = nums[i];
        }
        stack.push(i);
    }

    return result;
}

console.log(nextGreater([2, 1, 5, 3, 6, 4])); // [5, 5, 6, 6, -1, -1]
console.log(nextGreater([4, 3, 2, 1, 5]));     // [5, 5, 5, 5, -1]
console.log(nextGreater([1, 2, 3, 4, 5]));     // [2, 3, 4, 5, -1]
console.log(nextGreater([5, 4, 3, 2, 1]));     // [-1, -1, -1, -1, -1]
