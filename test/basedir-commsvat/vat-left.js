import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }

  function createNewObj() {
    return {
      method() {
        log(`=> left.1.method was invoked`);
        return 'called method';
      },
    };
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    E => {
      async function startTest(test, args) {
        switch (test) {
          case 'left does: E(right.0).method() => returnData': {
            const rightRootPresence = args[0];
            E(rightRootPresence)
              .method()
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method(dataArg1) => returnData': {
            const rightRootPresence = args[0];
            E(rightRootPresence)
              .methodWithArgs('hello')
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method(right.0) => returnData': {
            const rightRootPresence = args[0];
            E(rightRootPresence)
              .methodWithPresence(rightRootPresence)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method(left.1) => returnData': {
            const rightRootPresence = args[0];
            const leftRootPresence = args[1];
            const leftNewObjPresence = await E(leftRootPresence).createNewObj();
            E(rightRootPresence)
              .methodWithPresence(leftNewObjPresence)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method(left.1) => returnData twice': {
            const rightRootPresence = args[0];
            const leftRootPresence = args[1];
            const leftNewObjPresence = await E(leftRootPresence).createNewObj();

            // first time
            E(rightRootPresence)
              .methodWithPresenceTwice(leftNewObjPresence)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));

            // second time
            E(rightRootPresence)
              .methodWithPresenceTwice(leftNewObjPresence)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));

            // check logs to ensure the same ids are used
            break;
          }

          case 'left does: E(right.1).method() => returnData': {
            const rightRootPresence = args[0];
            const rightNewObjPresence = await E(
              rightRootPresence,
            ).createNewObj();
            E(rightNewObjPresence)
              .method()
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method() => right.presence': {
            const rightRootPresence = args[0];
            const presence = E(rightRootPresence).methodReturnsRightPresence();
            E(presence)
              .method()
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method() => left.presence': {
            const rightRootPresence = args[0];
            const newLeftObj = createNewObj();
            const presence = E(rightRootPresence).methodReturnsLeftPresence(
              newLeftObj,
            );
            E(presence)
              .method()
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method() => right.promise => data': {
            const rightRootPresence = args[0];
            const result = E(rightRootPresence).methodReturnsPromise();
            log(`=> left vat receives the returnedPromise: ${result}`);
            result.then(r => log(`=> returnedPromise.then: ${r}`));
            break;
          }

          case 'left does: E(right.0).method() => right.promise => right.presence': {
            const rightRootPresence = args[0];
            const result = E(
              rightRootPresence,
            ).methodReturnsPromiseForRightPresence();
            log(`=> left vat receives the returnedPromise: ${result}`);
            result.then(async r => {
              log(`=> returnedPromise.then: ${r}`);
              // call method on presence to confirm expected presence
              const methodCallResult = await E(r).method();
              log(`=> presence methodCallResult: ${methodCallResult}`);
            });
            break;
          }

          case 'left does: E(right.0).method() => right.promise => left.presence': {
            const rightRootPresence = args[0];
            const leftPresence = createNewObj();
            const result = E(
              rightRootPresence,
            ).methodReturnsPromiseForLeftPresence(leftPresence);
            log(`=> left vat receives the returnedPromise: ${result}`);
            result.then(async r => {
              log(`=> returnedPromise.then: ${r}`);
              // call method on presence to confirm expected presence
              const methodCallResult = await E(r).method();
              log(`=> presence methodCallResult: ${methodCallResult}`);
            });
            break;
          }

          case 'left does: E(right.0).method() => right.promise => reject': {
            const rightRootPresence = args[0];
            try {
              await E(rightRootPresence).methodReturnsPromiseReject();
            } catch (err) {
              log(
                `=> left vat receives the rejected promise with error ${err}`,
              );
            }
            break;
          }

          case 'left does: E(right.0).method(left.promise) => returnData': {
            const rightRootPresence = args[0];
            const lpromise = new Promise((resolve, _reject) => {
              resolve('foo');
            });
            E(rightRootPresence)
              .methodWithPromise(lpromise)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          case 'left does: E(right.0).method(right.promise) => returnData': {
            const rightRootPresence = args[0];
            const rpromise = E(rightRootPresence).methodReturnsPromise();
            E(rightRootPresence)
              .methodWithPromise(rpromise)
              .then(r => log(`=> left vat receives the returnedData: ${r}`));
            break;
          }

          default:
            throw new Error(`test ${test} not recognized`);
        }
      }

      return harden({
        startTest,
        createNewObj,
      });
    },
    helpers.vatID,
  );
}
