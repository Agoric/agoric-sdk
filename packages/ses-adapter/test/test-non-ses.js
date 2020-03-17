import { testHarden } from './do-harden.js';
// eslint-disable-next-line no-unused-vars
import { testCompartment } from './do-compartment.js';
import { testHandledPromise } from './do-handled-promise.js';

testHarden();
// disabled because our non-SES 'Compartment' is still a non-functioning stub
// testCompartment();
testHandledPromise();
