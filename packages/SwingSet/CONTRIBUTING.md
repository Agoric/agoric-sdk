# Contributing to the SwingSet Vat Machine

Thank you!

## Contact

We use github issues for all bug reports: https://github.com/Agoric/SwingSet/issues

## Installing, Testing

You'll need Node.js version 11 or higher. There is a unit test to
double-check that you have a suitable version.

* git clone https://github.com/Agoric/SwingSet
* npm install
* npm test

## Pull Requests

Before submitting a pull request, please:

* run `npm test` and make sure all the unit tests pass
* run `npm run-script lint-fix` to reformat the code according to our
  `eslint` profile, and fix any complaints that it can't automatically
  correct
