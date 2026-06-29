function slidingWindowMaximum(nums, k) {
    const dq = [];  // monotonic deque of indices
    const result = [];

    for (let i = 0; i < nums.length; i++) {
        // Evict stale index from front
        if (dq.length && dq[0] < i - k + 1) dq.shift();

        // Evict smaller values from back
        while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop();

        dq.push(i);

        if (i >= k - 1) result.push(nums[dq[0]]);
    }

    return result;
}


console.log(slidingWindowMaximum([1, 3, -1, -3, 5, 3, 6, 7], 3));
// [3, 3, 5, 5, 6, 7]

console.log(slidingWindowMaximum([9, 8, 7, 6, 5], 2));
// [9, 8, 7, 6]

console.log(slidingWindowMaximum([1], 1));
// [1]
