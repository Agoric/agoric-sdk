
import { lockdown } from 'ses';

lockdown();
// We are now in the "Start Compartment". Our global has all the same
// powerful things it had before, but the primordials have changed to make
// them safe to use in the arguments of API calls we make into more limited
// compartments. 'Compartment' and 'harden' are now present in our global
// scope.
