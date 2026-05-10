def find_duplicate(nums):
    slow = nums[0]
    fast = nums[0]

    # Phase 1: find meeting point inside the cycle
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break

    # Phase 2: find cycle entry = duplicate
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]

    return slow


if __name__ == "__main__":
    test_cases = [
        ([1, 3, 4, 2, 2], 2),
        ([3, 1, 3, 4, 2], 3),
        ([2, 2, 2, 2, 2], 2),
        ([1, 1],          1),
    ]

    for nums, expected in test_cases:
        result = find_duplicate(nums)
        status = "✓" if result == expected else "✗"
        print(f"{status}  {nums}  →  {result}")
