= The Domain Vat Container =

(desperately needs a better name)

This repository holds an experiment in building a "container" for a collection of Vats, which act like "domains" in KeyKOS. These Vats hold references to each other, but not to the outside world (all inter-container communication is managed by special "comms vats"). Each Vat is like a userspace process, and they all have a syscall-like interface to a "kernel" or "domain controller". This kernel manages inter-Vat slots (including three-party introduction, which is easier because it is centralized) and message delivery.

These Vats can be migrated to a new container, so their API to the kernel is limited to things that can be serialized and transplanted easily. The Vat is the unit of concurrency (the kernel is allowed to run vats in parallel, if it can), migration, synchronous invocation (Near references). The kernel/container might be a single computer, a quorum of lock-step replicas, or a proposer/validator blockchain

== M1 ==


Syscall interface only: userspace has no Vows, Flows, serialization, E().foo .

userspace module default export is the deliver() dispatch function, it gets the syscall object with each call

userspace uses interior mutability (top-level 'let') for state

kernelspace has one queue, manages slot tables, exports/imports

all message sends are unidirectional

launch bin/vat in basedir with one subdir per vat, index.js in each subdir

basedir/wiring.js default export is invoked with an object that lets it create slots and invoke facetid=0 of each vat, to wire things together. Identifies vats by their name (the subdirectory name).

interactive shell with:

* modes: paused, free-run. When paused, the kernel delivers no messages until single-stepped
* top-level commands: run, pause, step, send(vatid, facetid, args-something), show-tables

== M2 ==

Add userspace Vows, E().foo() or Vow.resolve().foo(), proxies. Persist the imports/exports tables. Kernel remains unaware of flows, still has just one queue.

== M3 ==

Introduce kernel-side Flows, add support for Meters, eventually Keepers.
