def majority_vote(nums):
    candidate, count = None, 0

    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1

    return candidate


if __name__ == "__main__":
    test_cases = [
        ([2, 2, 1, 1, 1, 2, 2], 2),
        ([3, 2, 3],               3),
        ([1],                     1),
        ([6, 6, 6, 7, 7],         6),
    ]

    for nums, expected in test_cases:
        result = majority_vote(nums)
        status = "✓" if result == expected else "✗"
        print(f"{status}  majority_vote({nums}) = {result}")
