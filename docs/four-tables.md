In CapTP, there are four tables: questions, answers, imports, and
exports.

For us, anything that is on our machine that we want to allow another
machine to reference is an EGRESS. Likewise, anything that we want to
reference on another machine is an INGRESS. Ingresses and egresses can
appear in the slots of messages going either way - in other words, the
arguments of my message can be referencing either things on my machine
or your machine. Targets, on the other hand, should only reference
objects that are actually on the other machine (is this right?).

For more information about the four tables in CapTP see:
http://www.erights.org/elib/distrib/captp/4tables.html

In the same way that Egresses are real objects that have agency, and Ingresses are
presences, Answers are the resolver end, and Questions are promises.
Holding a Question means that you will be notified when the promise
settles. Holding an Answer means you have the ability to settle the
promise. 


