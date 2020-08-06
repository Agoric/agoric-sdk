// This module is essentially identical to '@agoric/install-metering-and-ses'
// except that instead of importing
// '@agoric/install-metering-and-ses/install-global-metering' it imports a
// local tweaked version of same that scans the command line to decide if it is
// going to install global metering or not.

import './install-optional-global-metering';
import '@agoric/install-ses';
