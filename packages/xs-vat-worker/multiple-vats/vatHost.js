const { freeze } = Object; // cf. harden

function testLog(...args) {
  trace(`TEST: ${JSON.stringify(args)}\n`);
}
testLog(`hello from vatHost`);

export default function main() {
  testLog(`hello from vatHost.main`);
  globalThis.handle = (handleArg) => {
    testLog(`hello from handle(${handleArg})`);
    return JSON.stringify(['ok']);
  };
  return;
  const clist = {};
  let nextSlot = 1;

  const vatCmp = new Compartment();
  const handle = freeze(async ([type, ...margs]) => {
    trace(`vatHost handling: ${JSON.stringify([type, ...margs])}\n`);

    switch (type) {
      case "setBundle":
        {
          const [bundle] = margs;
          const buildRoot = vatCmp.evaluate(bundle);
          clist[`slot${nextSlot++}`] = buildRoot({ testLog });
          // port.postMessage("ok");
          globalThis.toParent(['bundleLoaded']);
        }
        break;
      case "deliver":
        {
          const [dtype, targetRef, { method, args }] = margs;
          const target = clist[targetRef];
          const result = target[method](...args);
          port.postMessage(['ok']);
        }
        break;
      default:
        throw new Error(type);
    }
  });

  // now export 'handle' somehow
  // globalThis.handle = handle; // fallback to this
  return handle; // prefer this, but need it to work in subsequent reloads too
}

//main(self);


// the loader is responsible for:
// * setting globalThis.toParent to a (new) function that synchronously calls into the dispatch unit
// * reading globalThis.handle to get a function that can be handed to the dispatch unit
