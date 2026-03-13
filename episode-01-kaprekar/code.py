# Episode 01: Kaprekar's Constant Experiment
# Kaprekar's constant is 6174. 
# Almost any 4-digit number will collapse to this value within 7 steps.

def kaprekar_process(n):
    """
    Substracts the ascending digit order from the descending digit order.
    """
    # Ensure 4 digits with leading zeros
    digits = f"{n:04d}"
    
    # Create descending and ascending numbers
    desc = int("".join(sorted(digits, reverse=True)))
    asc = int("".join(sorted(digits)))
    
    result = desc - asc
    print(f"{desc} - {asc} = {result}")
    return result

def run_experiment(start_number):
    print(f"--- Starting Curiosity Lab for: {start_number} ---")
    current = start_number
    steps = 0
    
    while current != 6174:
        current = kaprekar_process(current)
        steps += 1
        if steps > 10: # Safety break
            break
            
    print(f"--- Reached 6174 in {steps} steps! ---")

# Try it with a 4-digit number (at least two digits must be different)
if __name__ == "__main__":
    run_experiment(3524)
