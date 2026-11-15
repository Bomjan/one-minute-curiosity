import java.math.BigInteger;

public class code {
    static String balancedTernary(long value) {
        if (value == 0) return "0";
        StringBuilder digits = new StringBuilder();
        while (value != 0) {
            int remainder = (int) Math.floorMod(value, 3);
            value = Math.floorDiv(value, 3);
            if (remainder == 2) {
                digits.append('T'); // T means -1; carry one to the next place.
                value++;
            } else {
                digits.append((char) ('0' + remainder));
            }
        }
        return digits.reverse().toString();
    }

    static BigInteger decode(String digits) {
        BigInteger result = BigInteger.ZERO;
        for (char digit : digits.toCharArray()) {
            int value = digit == 'T' ? -1 : digit - '0';
            result = result.multiply(BigInteger.valueOf(3)).add(BigInteger.valueOf(value));
        }
        return result;
    }

    public static void main(String[] args) {
        for (long n : new long[] {-8, -2, -1, 0, 1, 2, 4, 8, 10, 42, Long.MIN_VALUE, Long.MAX_VALUE}) {
            String representation = balancedTernary(n);
            if (!decode(representation).equals(BigInteger.valueOf(n))) throw new AssertionError(n);
            System.out.println(n + " = " + representation);
        }
        for (long n = -10000; n <= 10000; n++) {
            if (!decode(balancedTernary(n)).equals(BigInteger.valueOf(n))) throw new AssertionError(n);
        }
        System.out.println("Verified 20,001 consecutive integers and long boundaries.");
    }
}
