def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # stores indices of elements awaiting their answer

    for i, val in enumerate(nums):
        while stack and nums[stack[-1]] < val:
            idx = stack.pop()
            result[idx] = val
        stack.append(i)

    return result


if __name__ == "__main__":
    print(next_greater([2, 1, 5, 3, 6, 4]))  # [5, 5, 6, 6, -1, -1]
    print(next_greater([4, 3, 2, 1, 5]))      # [5, 5, 5, 5, -1]
    print(next_greater([1, 2, 3, 4, 5]))      # [2, 3, 4, 5, -1]
    print(next_greater([5, 4, 3, 2, 1]))      # [-1, -1, -1, -1, -1]
