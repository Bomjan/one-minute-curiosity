// Episode 11: Hamming(7,4) - repair one flipped bit using parity.
// Run: javac code.java && java code
public class code {
    // Positions are counted from the RIGHT, starting at 1.
    // Parity bits occupy positions 1, 2, 4; data bits occupy 3, 5, 6, 7.
    static int bit(int word, int position) {
        return (word >>> (position - 1)) & 1;
    }

    static int encode(int value) {
        if (value < 0 || value > 15) {
            throw new IllegalArgumentException("Expected a 4-bit value (0..15)");
        }

        int word = 0;
        int[] dataPositions = {3, 5, 6, 7};
        for (int i = 0; i < 4; i++) {
            word |= ((value >>> (3 - i)) & 1) << (dataPositions[i] - 1);
        }

        // Each parity bit makes its group have an even number of 1s.
        for (int parity : new int[]{1, 2, 4}) {
            int sum = 0;
            for (int position = 1; position <= 7; position++) {
                if ((position & parity) != 0) {
                    sum ^= bit(word, position);
                }
            }
            word |= sum << (parity - 1);
        }
        return word;
    }

    record Result(int value, int correctedPosition) {}

    static Result decode(int received) {
        if (received < 0 || received > 127) {
            throw new IllegalArgumentException("Expected a 7-bit word (0..127)");
        }

        // A bad parity group contributes its position value to the syndrome.
        int syndrome = 0;
        for (int parity : new int[]{1, 2, 4}) {
            int sum = 0;
            for (int position = 1; position <= 7; position++) {
                if ((position & parity) != 0) {
                    sum ^= bit(received, position);
                }
            }
            if (sum != 0) syndrome |= parity;
        }

        int corrected = received;
        if (syndrome != 0) corrected ^= 1 << (syndrome - 1);

        int value = (bit(corrected, 3) << 3)
                  | (bit(corrected, 5) << 2)
                  | (bit(corrected, 6) << 1)
                  | bit(corrected, 7);
        return new Result(value, syndrome);
    }

    static String binary(int value, int width) {
        return String.format("%" + width + "s", Integer.toBinaryString(value))
                .replace(' ', '0');
    }

    public static void main(String[] args) {
        int original = 0b1011;
        int encoded = encode(original);
        int damaged = encoded ^ (1 << (5 - 1)); // Flip position 5.
        Result result = decode(damaged);

        System.out.println("Data:      " + binary(original, 4));
        System.out.println("Encoded:   " + binary(encoded, 7));
        System.out.println("Damaged:   " + binary(damaged, 7));
        System.out.println("Fixed bit: " + result.correctedPosition());
        System.out.println("Recovered: " + binary(result.value(), 4));

        // All 16 possible messages, with no error or any single-bit error.
        int cases = 0;
        for (int value = 0; value < 16; value++) {
            int word = encode(value);
            for (int flipped = 0; flipped <= 7; flipped++) {
                int received = flipped == 0 ? word : word ^ (1 << (flipped - 1));
                Result actual = decode(received);
                if (actual.value() != value || actual.correctedPosition() != flipped) {
                    throw new AssertionError("Failed value=" + value + ", bit=" + flipped);
                }
                cases++;
            }
        }
        System.out.println("Verified " + cases + " no-error/single-error cases.");
    }
}
