Anything object that is on our machine that we want to allow another
machine to reference is an EGRESS. Likewise, any object that we want to
reference on another machine is an INGRESS. Ingresses and egresses can
appear in the slots of messages going either way - in other words, the
arguments of my message can be referencing either things on my machine
or your machine. 

In the same way that Egresses are real objects that have agency, and Ingresses are
presences, we can send messages about Promises and Resolvers.
Holding a promise means that you will be notified when the promise
settles. Holding a resolver means you have the ability to settle the
promise. 

Comparison to E CapTP:

In the E version of CapTP, there are four tables: questions, answers, imports, and
exports. We only have ingresses and egresses

For more information about the four tables in CapTP see:
http://www.erights.org/elib/distrib/captp/4tables.html
