import java.util.Arrays;

public class code {
    // Cancel pairs of different values; a true majority cannot disappear.
    static Integer majority(int[] values) {
        int candidate = 0;
        int balance = 0;
        for (int value : values) {
            if (balance == 0) candidate = value;
            balance += (value == candidate) ? 1 : -1;
        }
        if (balance == 0) return null;
        int count = 0;
        for (int value : values) if (value == candidate) count++;
        return count > values.length / 2 ? candidate : null;
    }

    public static void main(String[] args) {
        int[] votes = {7, 2, 7, 3, 7, 2, 7};
        System.out.println(Arrays.toString(votes));
        System.out.println("Majority: " + majority(votes)); // 7
        System.out.println("No majority: " + majority(new int[]{1, 2, 3, 1}));
    }
}
