def find_celebrity(n, knows):
    # Elimination phase: narrow down to one candidate
    candidate = 0
    for i in range(1, n):
        if knows(candidate, i):
            candidate = i

    # Verification phase: confirm the candidate is a true celebrity
    for i in range(n):
        if i == candidate:
            continue
        if knows(candidate, i) or not knows(i, candidate):
            return -1

    return candidate


if __name__ == "__main__":
    # Test 1: Person 3 is the celebrity
    matrix = [
        [False, True,  True,  True],
        [False, False, True,  True],
        [False, False, False, True],
        [False, False, False, False],
    ]

    def knows(a, b):
        return matrix[a][b]

    result = find_celebrity(4, knows)
    print(f"Celebrity: {result}")  # 3

    # Test 2: No celebrity (circular knowing)
    matrix2 = [
        [False, True,  False],
        [False, False, True],
        [True,  False, False],
    ]

    def knows2(a, b):
        return matrix2[a][b]

    result2 = find_celebrity(3, knows2)
    print(f"Celebrity: {result2}")  # -1

    # Test 3: Single person (trivially a celebrity)
    def knows3(a, b):
        return False

    result3 = find_celebrity(1, knows3)
    print(f"Celebrity: {result3}")  # 0
