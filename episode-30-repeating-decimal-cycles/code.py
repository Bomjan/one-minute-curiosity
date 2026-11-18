def decimal_parts(numerator, denominator):
    if numerator < 0 or denominator <= 0:
        raise ValueError("Use a nonnegative numerator and positive denominator")

    whole, remainder = divmod(numerator, denominator)
    digits = []
    seen = {}  # First position where each remainder appeared.

    while remainder and remainder not in seen:
        seen[remainder] = len(digits)
        remainder *= 10
        digit, remainder = divmod(remainder, denominator)
        digits.append(str(digit))

    if remainder == 0:
        return f"{whole}." + ("".join(digits) or "0")

    start = seen[remainder]
    return f"{whole}." + "".join(digits[:start]) + "(" + "".join(digits[start:]) + ")"


if __name__ == "__main__":
    for denominator in (2, 3, 6, 7, 13, 17):
        print(f"1/{denominator} = {decimal_parts(1, denominator)}")
