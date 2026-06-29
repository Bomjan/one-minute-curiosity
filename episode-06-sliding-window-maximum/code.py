from collections import deque


def sliding_window_maximum(nums, k):
    dq = deque()  # stores indices, values are decreasing
    result = []

    for i, val in enumerate(nums):
        # Remove indices that are outside the window
        if dq and dq[0] < i - k + 1:
            dq.popleft()

        # Remove indices whose values are smaller than current
        while dq and nums[dq[-1]] < val:
            dq.pop()

        dq.append(i)

        # Window is fully formed starting at index k-1
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result


if __name__ == "__main__":
    print(sliding_window_maximum([1, 3, -1, -3, 5, 3, 6, 7], 3))
    # [3, 3, 5, 5, 6, 7]

    print(sliding_window_maximum([9, 8, 7, 6, 5], 2))
    # [9, 8, 7, 6]

    print(sliding_window_maximum([1], 1))
    # [1]
