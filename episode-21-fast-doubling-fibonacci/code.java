import java.math.BigInteger;

public class code {
    // Returns {F(n), F(n+1)} using the doubling identities.
    static BigInteger[] fibonacciPair(int n) {
        if (n == 0) return new BigInteger[]{BigInteger.ZERO, BigInteger.ONE};

        BigInteger[] half = fibonacciPair(n / 2);
        BigInteger a = half[0], b = half[1];
        BigInteger even = a.multiply(b.shiftLeft(1).subtract(a));
        BigInteger next = a.multiply(a).add(b.multiply(b));

        if (n % 2 == 0) return new BigInteger[]{even, next};
        return new BigInteger[]{next, even.add(next)};
    }

    public static void main(String[] args) {
        BigInteger previous = BigInteger.ZERO, current = BigInteger.ONE;
        for (int n = 0; n <= 1000; n++) {
            BigInteger[] pair = fibonacciPair(n);
            if (!pair[0].equals(previous) || !pair[1].equals(current)) {
                throw new AssertionError("Mismatch at n=" + n);
            }
            BigInteger sum = previous.add(current);
            previous = current;
            current = sum;
        }
        System.out.println("Verified F(0) through F(1000).");
        System.out.println("F(100) = " + fibonacciPair(100)[0]);
        System.out.println("F(1000) has " + fibonacciPair(1000)[0].toString().length() + " digits.");
    }
}
