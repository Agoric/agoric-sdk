Part of the Agoric strategy for providing security is based on the
[Formal Methods](https://agoric.com/papers/#formal-reasoning) literature, which has developed
tools for proving that programs follow their specifications. There have been interesting
advances in this area including the development of
[seL4](https://sel4.systems/Info/FAQ/proof.pml) and the
[proof of its correctness](https://sel4.systems/Info/FAQ/proof.pml). We have been collaborating
with a group of researchers including Sophia Drossopoulou (Imperial College London), James
Noble (Victoria University of Wellington), Toby Murray (NICTA and UNSW), and Susan Eisenbach
(Imperial College London) who are investigating how to apply these techniques to secure
distributed programs.

This work
([Reasoning about Risk and Trust in an Open World](https://ai.google/research/pubs/pub44272)
has resulted in development of a specification language, Chainmail, which is intended to allow
programs to be described with enough formality to investigate their security properties. We are
using the same name here for an IDL (Interface Definition Language) based on a syntactic subset
of [Cap'n Proto](https://capnproto.org/language.html#generic-methods) to describe some of the
core modules of ERTP: 
[assays](https://github.com/Agoric/ERTP/blob/master/core/assays.chainmail),
[contractHost](https://github.com/Agoric/ERTP/blob/master/core/contractHost.chainmail), and
[issuers](https://github.com/Agoric/ERTP/blob/master/core/issuers.chainmail). We're re-using
the name chainmail because we intend to extend this IDL into a concrete syntax for the abstract
specification language, and this IDL syntax seems a good place to start. We have several other
ideas for making use of chainmail descriptions:

* We might enable our CapTP protocol to detect and enforce compliance with object interfaces
* Generate TypeScript code to cross-check type consistency
* Validate inter-object calls within Vats using membranes
* Generate Capn Proto adapters and bindings for other languages

We have a simple parser (which produces a parse tree, but doesn't make any use of it at this
point.) To validate the format of a chainmail file, you can run the parser against it.

```bash
git clone -b chainmail https://github.com/Agoric/jessica
npm install
jessica/lang/nodejs/cmparse.bat [single .chainmail file]
```




