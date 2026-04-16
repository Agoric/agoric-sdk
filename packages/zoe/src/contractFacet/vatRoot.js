// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { makeBuildRootObject } from './buildRootObject.js';
import { makeZCFZygote } from './zcfZygote.js';

export const buildRootObject = makeBuildRootObject(makeZCFZygote);

harden(buildRootObject);
