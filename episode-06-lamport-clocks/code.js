class Process {
    constructor(name) {
        this.name = name;
        this.clock = 0;
    }

    localEvent() {
        return ++this.clock;
    }

    send() {
        // Sending is an event; the timestamp travels with the message
        return ++this.clock;
    }

    receive(timestamp) {
        // Jump past anything the sender had already seen
        this.clock = Math.max(this.clock, timestamp) + 1;
        return this.clock;
    }
}

const a = new Process("A");
const b = new Process("B");
const c = new Process("C");

a.localEvent();                                  // A: 1
for (let i = 0; i < 4; i++) b.localEvent();      // B: 4

const msg = b.send();                            // B: 5
console.log("A receives:", a.receive(msg));      // 6, not 2

const reply = a.send();                          // A: 7
console.log("C receives:", c.receive(reply));    // 8, not 1
