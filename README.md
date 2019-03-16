# SwingSet Vat

This repository contains another proof-of-concept Vat host, like
PlaygroundVat. This one is modeled after KeyKOS "Domains": all Vats run on
top of a "kernel" as if they were userspace processes in an operating system.
Each Vat gets access to a "syscall" object, through which it can send
messages into the kernel. Vats receive message from the kernel via a
"dispatch" function which they register at startup.

Our goal is to experiment with different serialization/queueing mechanisms.
One such mechanism is implemented so far, named "live slots", but we know
this is insufficient to provide persistence across restarts.

More docs are in the works. For now, try:

```
$ npm install
$ npm test
$ bin/vat demo/left-right
vat> run()
```

This repository is still in early development: APIs and features are not
expected to stabilize for a while.
