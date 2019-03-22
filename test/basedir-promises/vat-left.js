import harden from '@agoric/harden';

export default function setup(syscall, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    helpers.vatID,
  );

  const obj0 = {
    callRight(arg1, right) {
      log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => log(`left.then ${a}`));
      return 3;
    },
    call2(arg) {
      log(`left.call2 ${arg}`);
      return harden({
        call3(x) {
          log(`left.call3 ${x}`);
          return 3;
        },
      });
    },

    returnArg(arg) {
      log(`left.returnArg`);
      return arg;
    },

    returnMyObject() {
      return harden({
        foo(x) {
          log(`left.myobject.call ${x}`);
        },
      });
    },

    takePromise(p1) {
      log(`left.takePromise`);
      return harden(
        p1.then(t1 => {
          log(`left.takePromise.then`);
          E(t1).foo(1);
          return 4;
        }),
      );
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
