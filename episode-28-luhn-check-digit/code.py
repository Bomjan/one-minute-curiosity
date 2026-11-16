def checksum(digits):
    total = 0
    for index, character in enumerate(reversed(digits)):
        digit = int(character)
        if index % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10


def add_check_digit(payload):
    if not payload or not payload.isascii() or not payload.isdecimal():
        raise ValueError("Use nonempty ASCII digits")
    return payload + str((-checksum(payload + "0")) % 10)


def valid(number):
    return bool(number) and number.isascii() and number.isdecimal() and checksum(number) == 0


if __name__ == "__main__":
    number = add_check_digit("7992739871")
    print("Generated:", number)
    print("Valid:", valid(number))
    print("Changed digit valid:", valid("79927398714"))
    assert number == "79927398713"
    assert valid(number)
    for position in range(len(number)):
        for replacement in "0123456789":
            if replacement != number[position]:
                altered = number[:position] + replacement + number[position + 1:]
                assert not valid(altered)
    print("All 99 single-digit substitutions detected.")
