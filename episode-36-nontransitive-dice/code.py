from itertools import product

A = (2, 2, 4, 4, 9, 9)
B = (1, 1, 6, 6, 8, 8)
C = (3, 3, 5, 5, 7, 7)

# Count every equally likely pair of face rolls.
for name, first, second in [("A beats B", A, B),
                            ("B beats C", B, C),
                            ("C beats A", C, A)]:
    wins = sum(x > y for x, y in product(first, second))
    print(f"{name}: {wins}/36 = {wins / 36:.2%}")
    assert wins == 20
