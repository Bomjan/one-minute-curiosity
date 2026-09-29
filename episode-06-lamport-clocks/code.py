class Process:
    def __init__(self, name):
        self.name = name
        self.clock = 0

    def local_event(self):
        self.clock += 1
        return self.clock

    def send(self):
        # Sending is an event; the timestamp travels with the message
        self.clock += 1
        return self.clock

    def receive(self, timestamp):
        # Jump past anything the sender had already seen
        self.clock = max(self.clock, timestamp) + 1
        return self.clock


if __name__ == "__main__":
    a, b, c = Process("A"), Process("B"), Process("C")

    a.local_event()               # A: 1
    for _ in range(4):
        b.local_event()           # B: 4 (B's clock runs far ahead)

    msg = b.send()                # B: 5, message carries 5
    print("A receives:", a.receive(msg))   # 6, not 2

    reply = a.send()              # A: 7
    print("C receives:", c.receive(reply))  # 8, not 1
