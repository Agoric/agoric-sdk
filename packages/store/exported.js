import './src/types.js';

// TODO The following line should be deleted. It exports the type
// `MatchHelper` which is not used outside this store package. Without this
// line, this store package lints fine. But linting the governance
// package complains that it cannot find the type `MatchHelper`.
// I don't know why. I even tried adding
//   import '@agoric/store/exported.js';
// to the modules in governance that import from '@agoric/store',
// but it did not help.
//
// Even with this line, the solo package still has the same complaint.
// So instead I moved the MatchHelper type, which should be internal,
// to types.js. See the comment there.
import './src/patterns/internal-types.js';
