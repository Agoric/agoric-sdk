import './install-ses.js';
import { testHarden } from './do-harden.js';
import { testCompartment } from './do-compartment.js';
import { testHandledPromise } from './do-handled-promise.js';

testHarden();
testCompartment();
testHandledPromise();
