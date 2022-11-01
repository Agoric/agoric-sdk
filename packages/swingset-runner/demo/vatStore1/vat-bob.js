import { Far } from '@endo/marshal';
import { defineKind } from '@agoric/vat-data';

const p = console.log;

const makeThing = defineKind(
  'thing',
  (label = 'thing', counter = 0) => {
    p(`@@@ thing.initialize(${label}, ${counter})`);
    return { counter, label, resetCounter: 0 };
  },
  {
    inc({ state }) {
      state.counter += 1;
      p(`#thing# ${state.label} inc() counter now ${state.counter}`);
    },
    reset({ state }, newStart) {
      p(`#thing# ${state.label} reset(${newStart})`);
      state.counter = newStart;
      state.resetCounter += 1;
    },
    relabel({ state }, newLabel) {
      p(`#thing# ${state.label} relabel(${newLabel})`);
      state.label = newLabel;
    },
    get({ state }) {
      p(`#thing# ${state.label} get()=>${state.counter}`);
      return state.counter;
    },
    describe({ state }) {
      p(`#thing# ${state.label} describe()`);
      return `${state.label} counter has been reset ${state.resetCounter} times and is now ${state.counter}`;
    },
  },
);

const makeZot = defineKind(
  'zot',
  (arbitrary = 47, name = 'Bob', tag = 'say what?') => {
    p(`@@@ zot.initialize(${arbitrary}, ${name}, ${tag})`);
    return { arbitrary, name, tag, count: 0 };
  },
  {
    sayHello({ state }, msg) {
      p(`#zot# ${msg} ${state.name}`);
      state.count += 1;
    },
    rename({ state }, newName) {
      p(`#zot# ${state.name} rename(${newName})`);
      state.name = newName;
      state.count += 1;
    },
    printInfo({ state }) {
      // prettier-ignore
      p(`#zot# ${state.name} tag=${state.tag} count=${state.count} arbitrary=${state.arbitrary}`);
      state.count += 1;
    },
  },
);

export function buildRootObject() {
  let thing1;
  let thing2;
  let thing3;
  let thing4;

  let zot1;
  let zot2;
  let zot3;
  let zot4;

  return Far('root', {
    doYourStuff(phase) {
      p('=> Bob: doYourStuff!');
      switch (phase) {
        case 0:
          p('phase 0: start');
          break;
        case 1:
          p('phase 1: object creations');
          thing1 = makeThing('thing-1');
          thing2 = makeThing('thing-2', 100);
          thing3 = makeThing('thing-3', 200);
          thing4 = makeThing('thing-4', 300);

          zot1 = makeZot(23, 'Alice', 'is this on?');
          zot2 = makeZot(29, 'Bob', 'what are you saying?');
          zot3 = makeZot(47, 'Carol', 'as if...');
          zot4 = makeZot(66, 'Dave', 'you and what army?');
          break;
        case 2:
          p('phase 2: first batch-o-stuff');
          thing1.inc();
          zot1.sayHello('hello');
          thing1.inc();
          zot2.sayHello('hi');
          thing1.inc();
          zot3.sayHello('aloha');
          zot4.sayHello('bonjour');
          zot1.sayHello('hello again');
          p(`${thing2.describe()}`);
          break;
        case 3:
          p('phase 3: second batch-o-stuff');
          p(`thing1 counter = ${thing1.get()}`);
          thing1.inc();
          thing4.reset(1000);
          zot3.rename('Chester');
          zot1.printInfo();
          zot2.printInfo();
          p(`${thing2.describe()}`);
          zot3.printInfo();
          zot4.printInfo();
          thing3.inc();
          p(`${thing4.describe()}`);
          break;
        default:
          // because otherwise eslint complains
          break;
      }
    },
  });
}
