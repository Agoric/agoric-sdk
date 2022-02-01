/* global makeKind */
import { Far } from '@endo/marshal';

const p = console.log;

function makeThingInstance(state) {
  return {
    init(label = 'thing', counter = 0) {
      p(`@@@ thing.initialize(${label}, ${counter})`);
      state.counter = counter;
      state.label = label;
      state.resetCounter = 0;
    },
    self: Far('thing', {
      inc() {
        state.counter += 1;
        p(`#thing# ${state.label} inc() counter now ${state.counter}`);
      },
      reset(newStart) {
        p(`#thing# ${state.label} reset(${newStart})`);
        state.counter = newStart;
        state.resetCounter += 1;
      },
      relabel(newLabel) {
        p(`#thing# ${state.label} relabel(${newLabel})`);
        state.label = newLabel;
      },
      get() {
        p(`#thing# ${state.label} get()=>${state.counter}`);
        return state.counter;
      },
      describe() {
        p(`#thing# ${state.label} describe()`);
        return `${state.label} counter has been reset ${state.resetCounter} times and is now ${state.counter}`;
      },
    }),
  };
}

const thingMaker = makeKind(makeThingInstance);

function makeZotInstance(state) {
  return {
    init(arbitrary = 47, name = 'Bob', tag = 'say what?') {
      p(`@@@ zot.initialize(${arbitrary}, ${name}, ${tag})`);
      state.arbitrary = arbitrary;
      state.name = name;
      state.tag = tag;
      state.count = 0;
    },
    self: Far('zot', {
      sayHello(msg) {
        p(`#zot# ${msg} ${state.name}`);
        state.count += 1;
      },
      rename(newName) {
        p(`#zot# ${state.name} rename(${newName})`);
        state.name = newName;
        state.count += 1;
      },
      printInfo() {
        // prettier-ignore
        p(`#zot# ${state.name} tag=${state.tag} count=${state.count} arbitrary=${state.arbitrary}`);
        state.count += 1;
      },
    }),
  };
}

const zotMaker = makeKind(makeZotInstance);

export function buildRootObject(_vatPowers) {
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
          thing1 = thingMaker('thing-1');
          thing2 = thingMaker('thing-2', 100);
          thing3 = thingMaker('thing-3', 200);
          thing4 = thingMaker('thing-4', 300);

          zot1 = zotMaker(23, 'Alice', 'is this on?');
          zot2 = zotMaker(29, 'Bob', 'what are you saying?');
          zot3 = zotMaker(47, 'Carol', 'as if...');
          zot4 = zotMaker(66, 'Dave', 'you and what army?');
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
