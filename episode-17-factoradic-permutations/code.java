import java.util.ArrayList;
import java.util.List;

public class code {
    // Find the zero-based kth permutation in lexicographic order.
    static String unrank(int n, long k) {
        if (n < 1 || n > 20) throw new IllegalArgumentException("n must be 1..20");
        long factorial = 1;
        for (int i = 2; i <= n; i++) factorial *= i;
        if (k < 0 || k >= factorial) throw new IllegalArgumentException("k out of range");

        List<Integer> remaining = new ArrayList<>();
        for (int i = 1; i <= n; i++) remaining.add(i);
        StringBuilder result = new StringBuilder();
        for (int size = n; size >= 1; size--) {
            factorial /= size; // (size - 1)! permutations per first choice
            int index = (int) (k / factorial);
            k %= factorial;
            if (result.length() > 0) result.append(' ');
            result.append(remaining.remove(index));
        }
        return result.toString();
    }

    public static void main(String[] args) {
        System.out.println("First: " + unrank(5, 0));
        System.out.println("42nd:  " + unrank(5, 41));
        System.out.println("Last:  " + unrank(5, 119));
    }
}
