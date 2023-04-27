import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let vatAdminService;
  let staticVats;
  let criticalVatKey;
  let root;
  let adminNode;

  const self = Far('root', {
    bootstrap(vats, devices) {
      vatAdminService = E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      staticVats = vats;
    },

    async setupCriticalVatKey() {
      criticalVatKey = await E(staticVats.vatAdmin).getCriticalVatKey();
    },

    async setupTestVat(critical, dynamic) {
      // create a dynamic vat, send it a message and let it respond, to make
      // sure everything is working
      if (dynamic) {
        const dude = await E(vatAdminService).createVatByName('dude', {
          critical: critical ? criticalVatKey : false,
        });
        root = dude.root;
        adminNode = dude.adminNode;
      } else if (critical) {
        root = staticVats.staticCritical;
      } else {
        root = staticVats.staticNonCritical;
      }
      const count1 = await E(root).foo(1);
      // pushes 'FOO 1' to testLog
      testLog(`count1 ${count1}`); // 'count1 FOO SAYS 1'
    },

    async performTest(mode) {
      // get a promise that will never be resolved, at least not until the
      // vat dies
      const foreverP = E(root).never();
      foreverP.then(
        answer => testLog(`foreverP.then ${answer}`),
        err => testLog(`foreverP.catch ${err}`),
      );

      // and pipeline a message to it, which won't ever be delivered because
      // we haven't configured the vat to enable pipelining. This message
      // will sit in the kernel promise-table queue until the target
      // resolves. When the vat is killed, this ought to be rejected too.
      const afterForeverP = E(foreverP).something();
      afterForeverP.then(
        answer => testLog(`afterForeverP.then ${answer}`),
        err => testLog(`afterForeverP.catch ${err}`),
      );

      // make it send an outgoing query, both to make sure that works, and
      // also to make sure never() has been delivered before the vat is
      // killed
      const query2 = await E(root).elsewhere(self, 2);
      // pushes 'QUERY 2', 'GOT QUERY 2', 'ANSWER 2' to testLog
      testLog(`query2 ${query2}`); // 'query2 2'

      // now we queue up a batch of four messages:

      // the first will trigger another outgoing query ..
      const query3P = E(root).elsewhere(self, 3);
      query3P.then(
        answer => testLog(`query3P.then ${answer}`),
        err => testLog(`query3P.catch ${err}`),
      );
      // .. but it will be killed ..
      switch (mode) {
        case 'kill':
          E(adminNode).terminateWithFailure(mode);
          break;
        case 'happy':
          E(root).dieHappy(mode);
          break;
        case 'exceptionallyHappy':
          E(root).dieHappy(Error(mode));
          break;
        case 'happyTalkFirst':
          E(root).dieHappyButTalkToMeFirst(self, mode);
          break;
        case 'sad':
          E(root).dieSad(mode);
          break;
        case 'exceptionallySad':
          E(root).dieSad(Error(mode));
          break;
        case 'sadTalkFirst':
          E(root).dieSadButTalkToMeFirst(self, Error(mode));
          break;
        case 'dieReturningAPresence':
          E(root).dieReturningAPresence(self, Error(mode));
          break;
        default:
          console.log('something terrible has happened');
          break;
      }
      // .. before the third message can be delivered
      const foo4P = E(root).foo(4);
      foo4P.then(
        answer => testLog(`foo4P.then ${answer}`),
        err => testLog(`foo4P.catch ${err}`),
      );
      // then we try to kill the vat again, which should fail
      if (mode === 'kill') {
        const termP = E(adminNode).terminateWithFailure('because we said so');
        termP.then(
          val => testLog(`termP.then ${val}`),
          err => testLog(`termP.catch ${err}`),
        );
      }

      // the run-queue should now look like:
      // [dude.elsewhere(3), adminNode.terminate, dude.foo(4), adminNode.terminate]

      // finally we wait for the kernel to tell us that the vat is dead
      const doneP = adminNode ? E(adminNode).done() : null;

      // first, dude.elsewhere(self, 3) is delivered, which pushes
      // 'QUERY 3' to testLog, and sends query(). The run-queue should now look like:
      // [adminNode.terminate, dude.foo(4), adminNode.terminate, self.query(3)]

      // then terminate() is delivered, and the vat is killed. The kernel pushes a
      // message to vatAdmin to let the done() promise resolve. The kernel also
      // looks for the unresolved promises decided by the late vat, and rejects them,
      // which pushes notify events on the queue
      // run-queue is:
      // [dude.foo(4), adminNode.terminate, self.query(3), vatAdmin.fireDone,
      //  self.notify(foreverP), self.notify(afterForeverP)]

      // now dude.foo(4) comes up for delivery, and deliverToVat notices the
      // target is dead, so the kernel rejects the result, pushing another
      // notify
      // run-queue is:
      // [adminNode.terminate, self.query(3), vatAdmin.fireDone,
      //  self.notify(foreverP), self.notify(afterForeverP), self.notify(foo4P)]

      // now the duplicate terminate() comes up, and vatAdminVat should ignore it
      // run-queue is:
      // [self.query(3), vatAdmin.fireDone, self.notify(foreverP),
      //  self.notify(afterForeverP), self.notify(foo4P)]

      // now the self.query(3) gets delivered, which pushes 'GOT QUERY 3' onto testLog, and
      // resolves the result promise. The dead vat is the only subscriber, so the kernel
      // pushes a notify event to vat-dude for it (which will never be delivered)
      // run-queue is:
      // [vatAdmin.fireDone, self.notify(foreverP), self.notify(afterForeverP),
      //  self.notify(foo4P), dude.notify(answerP)]

      // now vatAdmin gets fireDone, which resolves the 'done' promise we've been awaiting for,
      // which pushes a notify
      // run-queue is:
      // [self.notify(foreverP), self.notify(afterForeverP), self.notify(foo4P),
      //  dude.notify(answerP), self.notify(doneP)]

      // We receive the rejection of foreverP, pushing 'foreverP.catch (err)' to testLog
      // We receive the rejection of afterForeverP, pushing 'afterForeverP.catch (err)' to testLog
      // run-queue is:
      // [self.notify(foo4P), dude.notify(answerP), self.notify(doneP)]

      // we receive the rejection of foo4P, pushing 'foo4P.catch (err)' to
      // testLog. The run-queue is:
      // [dude.notify(answerP), self.notify(doneP)]

      // the dude.notify(answerP) comes to the top of the run-queue, and the
      // kernel ignores it because the dude is dead. The run-queue is:
      // [self.notify(doneP)]

      // We finally hear about doneP resolving, allowing the bootstrap to
      // proceed to the end of the test. We push the 'done' message to testLog
      if (doneP) {
        try {
          const v = await doneP;
          testLog(`done result ${v} (Error=${v instanceof Error})`);
        } catch (e) {
          testLog(`done exception ${e} (Error=${e instanceof Error})`);
        }
      }
      testLog('done');

      return 'test done';
    },
    query(arg) {
      testLog(`GOT QUERY ${arg}`);
      return arg;
    },
  });
  return self;
}
