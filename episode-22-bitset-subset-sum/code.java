import java.math.BigInteger;
import java.util.Arrays;

public class code {
    static BigInteger reachableSums(int[] numbers) {
        BigInteger bits = BigInteger.ONE; // Bit zero means sum zero is reachable.
        for (int number : numbers) {
            if (number < 0) throw new IllegalArgumentException("Use nonnegative integers");
            bits = bits.or(bits.shiftLeft(number)); // Keep old sums and add this number.
        }
        return bits;
    }

    static boolean[] bruteForce(int[] numbers) {
        int total = Arrays.stream(numbers).sum();
        boolean[] possible = new boolean[total + 1];
        possible[0] = true;
        for (int number : numbers) {
            for (int sum = total; sum >= number; sum--) {
                if (possible[sum - number]) possible[sum] = true;
            }
        }
        return possible;
    }

    public static void main(String[] args) {
        int[] sample = {3, 5, 7};
        BigInteger bits = reachableSums(sample);
        System.out.println("Numbers: " + Arrays.toString(sample));
        System.out.println("Can make 10? " + bits.testBit(10));
        System.out.println("Can make 6? " + bits.testBit(6));

        int cases = 0;
        for (int mask = 0; mask < (1 << 12); mask++) {
            int[] values = new int[6];
            for (int i = 0; i < 6; i++) values[i] = (mask >>> (2 * i)) & 3;
            BigInteger actual = reachableSums(values);
            boolean[] expected = bruteForce(values);
            for (int sum = 0; sum < expected.length; sum++) {
                if (actual.testBit(sum) != expected[sum]) {
                    throw new AssertionError("Mismatch for " + Arrays.toString(values) + " at " + sum);
                }
            }
            cases++;
        }
        System.out.println("Verified " + cases + " input arrays against independent DP.");
    }
}
