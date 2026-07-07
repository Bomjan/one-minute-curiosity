def daily_temperatures(temps):
    result = [0] * len(temps)
    stack = []  # indices of days still waiting for a warmer day

    for i, temp in enumerate(temps):
        while stack and temp > temps[stack[-1]]:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)

    return result


if __name__ == "__main__":
    test_cases = [
        ([73, 74, 75, 71, 69, 72, 76, 73], [1, 1, 4, 2, 1, 1, 0, 0]),
        ([30, 40, 50, 60],                  [1, 1, 1, 0]),
        ([60, 50, 40, 30],                  [0, 0, 0, 0]),
        ([30, 60, 90, 50, 40, 80, 70, 100], [1, 1, 5, 2, 1, 2, 1, 0]),
    ]

    for temps, expected in test_cases:
        result = daily_temperatures(temps)
        status = "✓" if result == expected else "✗"
        print(f"{status}  {temps}")
        print(f"     got:      {result}")
        print(f"     expected: {expected}\n")
