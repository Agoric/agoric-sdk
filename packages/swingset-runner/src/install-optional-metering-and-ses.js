// This module is essentially identical to '@agoric/install-metering-and-ses'
// except that instead of importing
// '@agoric/install-metering-and-ses/install-global-metering' it imports a
// local tweaked version of same that scans the command line to decide if it is
// going to install global metering or not.

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
import './install-optional-global-metering.js';
import '@agoric/install-ses';
