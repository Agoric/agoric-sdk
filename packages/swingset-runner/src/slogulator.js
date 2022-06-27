import fs from 'fs';
import process from 'process';
import Readlines from 'n-readlines';
import yargs from 'yargs';

const { details: X } = assert;

/* eslint-disable no-use-before-define */

function usage() {
  console.error('usage message goes here');
}

function fail(message, printUsage) {
  console.error(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

export function main() {
  const argv = yargs(process.argv.slice(2))
    .string('out')
    .default('out', undefined, '<STDOUT>')
    .describe('out', 'File to output to')
    .string('annotations')
    .describe('annotations', 'Annotations file')
    .boolean('summarize')
    .describe('summarize', 'Output summary report at end')
    .boolean('vatspace')
    .describe('vatspace', "Show object refs in their vat's namespace")
    .boolean('kernelspace')
    .describe(
      'kernelspace',
      'Show object refs in the kernel namespace (default)',
    )
    .conflicts('vatspace', 'kernelspace')
    .boolean('crankbreaks')
    .default('crankbreaks', true)
    .describe('crankbreaks', 'Output labeled breaks between cranks')
    .boolean('clist')
    .default('clist', true)
    .describe('clist', 'Show C-list change events')
    .boolean('usesloggertags')
    .describe(
      'usesloggertags',
      'Display slogger events using full slogger tags',
    )
    .number('bigwidth')
    .default('bigwidth', 200)
    .describe('bigwidth', 'Width above which large values display as <BIG>')
    .strict()
    .usage('$0 [OPTIONS...] SLOGFILE')
    .version(false)
    .parse();

  const terse = !argv.usesloggertags;
  const kernelSpace = argv.kernelspace || !argv.vatspace;
  let bigWidth = argv.bigwidth;

  let out;
  if (argv.out) {
    out = fs.createWriteStream(argv.out);
  } else {
    out = process.stdout;
    out.on('error', e => {
      if (e.code === 'EPIPE') {
        process.exit(0);
      }
    });
  }

  const handlers = {
    clist: handleCList,
    console: handleConsole,
    'create-vat': handleCreateVat,
    deliver: handleDeliver,
    'deliver-result': handleDeliverResult,
    syscall: handleSyscall,
    'syscall-result': handleSyscallResult,
    terminate: handleTerminate,
    'import-kernel-start': handleImportKernelStart,
    'import-kernel-finish': handleImportKernelFinish,
    'vat-startup-start': handleVatStartupStart,
    'vat-startup-finish': handleVatStartupFinish,
    'replay-transcript-start': handleReplayTranscriptStart,
    'replay-transcript-finish': handleReplayTranscriptFinish,
    'start-replay-delivery': handleStartReplayDelivery,
    'finish-replay-delivery': handleFinishReplayDelivery,
    'start-replay': handleStartReplay,
    'finish-replay': handleFinishReplay,
    'cosmic-swingset-begin-block': handleCosmicSwingsetBeginBlock,
    'cosmic-swingset-end-block-start': handleCosmicSwingsetEndBlockStart,
    'cosmic-swingset-end-block-finish': handleCosmicSwingsetEndBlockFinish,
    'cosmic-swingset-deliver-inbound': handleCosmicSwingsetDeliverInbound,
  };

  const slogFile = argv._[0];
  let lines;
  try {
    lines = new Readlines(slogFile);
  } catch (e) {
    fail(`unable to open slog file ${slogFile}`);
  }

  const summary = {};
  let currentCrank = 0;
  let currentVat;
  let currentSyscallName;
  let importKernelStartTime = 0;
  let vatStartupStartTime = 0;
  let vatStartupVat;
  let replayTranscriptStartTime = 0;
  let replayTranscriptVat;
  let replayStartTime = 0;
  let replayVat;
  let replayDeliveryStartTime = 0;
  let replayDeliveryVat;
  let replayDeliveryNum;
  let replayDeliveryDelivery;
  let cosmicSwingsetBeginBlockTime = 0;
  let cosmicSwingsetEndBlockStartTime = 0;
  let cosmicSwingsetBlockTime;
  let cosmicSwingsetBlockHeight;

  const vatNames = new Map();
  const crankLabels = new Map();
  const kernelRefs = new Map();
  const vatRefs = new Map();

  if (argv.annotations) {
    let annotations;
    try {
      annotations = JSON.parse(fs.readFileSync(argv.annotations));
    } catch (e) {
      fail(`unable to read annotations file ${argv.annotations}: ${e.message}`);
    }
    if (annotations.comment) {
      p(`// ${annotations.comment}`);
      p('');
    }
    if (annotations.vatNames) {
      for (const [id, name] of Object.entries(annotations.vatNames)) {
        vatNames.set(id, name);
      }
    }
    if (annotations.crankLabels) {
      for (const [id, name] of Object.entries(annotations.crankLabels)) {
        crankLabels.set(id, name);
      }
    }
    if (annotations.kernelRefs) {
      for (const [ref, name] of Object.entries(annotations.kernelRefs)) {
        kernelRefs.set(ref, name);
      }
    }
    if (annotations.vatRefs) {
      for (const [vat, table] of Object.entries(annotations.vatRefs)) {
        for (const [ref, name] of Object.entries(table)) {
          let subTable = vatRefs.get(vat);
          if (!subTable) {
            subTable = new Map();
            vatRefs.set(vat, subTable);
          }
          subTable.set(ref, name);
        }
      }
    }
    if (annotations.bigWidth) {
      bigWidth = annotations.bigWidth;
    }
  }

  if (argv.crankbreaks) {
    p('// crank 0');
  }
  let line = lines.next();
  let lineNumber = 0;
  while (line) {
    lineNumber += 1;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (err) {
      p(`// JSON.parse error on line ${lineNumber}`);
      throw err;
    }
    const type = entry.type;
    if (entry.crankNum && entry.crankNum !== currentCrank) {
      currentCrank = entry.crankNum;
      currentVat = entry.vatID;
      if (argv.crankbreaks) {
        p('');
        const crankLabel = crankLabels.get(`${currentCrank}`);
        const crankTag = crankLabel ? ` --- ${crankLabel}` : '';
        // prettier-ignore
        p(`// crank ${currentCrank}: ${entry.vatID} ${vatLabel(entry)}${crankTag}`);
      }
    }
    if (summary[type]) {
      summary[type] += 1;
    } else {
      summary[type] = 1;
    }
    const handler = handlers[type] || defaultHandler;
    try {
      handler(entry);
    } catch (err) {
      p(`// handler problem on line ${lineNumber}`);
      throw err;
    }
    line = lines.next();
  }
  if (argv.crankbreaks) {
    p('');
    p('// end of slog');
  }

  if (argv.summarize) {
    p('summary:');
    for (const [type, count] of Object.entries(summary)) {
      p(`  ${type}: ${count}`);
    }
  }

  function p(str) {
    out.write(str);
    out.write('\n');
  }

  function defaultHandler(entry) {
    p(`@ ${entry.type}: ${JSON.stringify(entry)}`);
  }

  function vatLabel(entry) {
    return vatNames.get(entry.vatID) || '<no name>';
  }

  function handleCreateVat(entry) {
    if (entry.name) {
      vatNames.set(entry.vatID, entry.name);
    }
    // prettier-ignore
    p(`create-vat: ${entry.vatID} ${vatLabel(entry)} ${entry.dynamic ? 'dynamic' : 'static'} ${entry.description}`);
  }

  function pref(ref, ks = kernelSpace) {
    let name;
    if (ks) {
      name = kernelRefs.get(ref);
    } else {
      const subTable = vatRefs.get(currentVat);
      name = subTable && subTable.get(ref);
    }
    return name ? `<${name}>` : `@${ref}`;
  }

  function legibilizeValue(val, slots) {
    let result = '';
    if (Array.isArray(val)) {
      result = '[';
      for (const elem of val) {
        if (result.length !== 1) {
          result += ', ';
        }
        result += legibilizeValue(elem, slots);
      }
      result += ']';
    } else if (val && typeof val === 'object' && val.constructor === Object) {
      const qClass = val['@qclass'];
      if (qClass) {
        switch (qClass) {
          case 'undefined':
          case 'NaN':
          case 'Infinity':
          case '-Infinity':
            result = qClass;
            break;
          case 'bigint':
            result = val.digits;
            break;
          case 'slot':
            result = pref(slots[val.index]);
            break;
          case 'error':
            result = `new ${val.name}('${val.message}')`;
            break;
          default:
            assert.fail(X`unknown qClass ${qClass} in legibilizeValue`);
        }
      } else {
        result = '{';
        for (const prop of Object.getOwnPropertyNames(val)) {
          if (result.length !== 1) {
            result += ', ';
          }
          result += `${String(prop)}: ${legibilizeValue(val[prop], slots)}`;
        }
        result += '}';
      }
    } else {
      result = JSON.stringify(val);
    }
    return result.length > bigWidth ? '<BIG>' : result;
  }

  function legibilizeMessageArgs(args) {
    try {
      return JSON.parse(args.body).map(arg => legibilizeValue(arg, args.slots));
    } catch (e) {
      console.error(e);
      return [args];
    }
  }

  function pargs(args) {
    return legibilizeMessageArgs(args).join(', ');
  }

  function pdata(data) {
    return legibilizeValue(JSON.parse(data.body), data.slots);
  }

  function doDeliverMessage(delivery, prefix = '') {
    const target = delivery[1];
    const msg = delivery[2];
    // prettier-ignore
    p(`${prefix}deliver: ${pref(target)} <- ${msg.method}(${pargs(msg.args)}): ${pref(msg.result)}`);
  }

  function doDeliverNotify(delivery, prefix = '') {
    const resolutions = delivery[1];
    let idx = 0;
    for (const resolution of resolutions) {
      const [target, value] = resolution;
      let state;
      let data;
      // 'delivery' records for notifications have annoyingly different shapes
      // for the kernel ('kd') and vat ('vd') resolution records.
      // 'start-replay-delivery' records use the vat shape.
      //
      // The kernel resolution shape is:
      //   [TARGET, {state:STATESTR, refCount:REFCOUNT, data: { body: BODYSTR, slots: [...SLOTS]}}]
      // where STATESTR is 'fulfilled' or 'rejected'
      //
      // The vat resolution shape is:
      //   [TARGET, REJECTED, { body: BODYSTR, slots: [...SLOTS]}]
      // where REJECTED is false for fulfilled and true for rejected.
      //
      // We figure out which shape we're dealing with by checking to see if the
      // second element of the array is a boolean.
      if (typeof value === 'boolean') {
        state = value ? 'rejected' : 'fulfilled';
        data = resolution[2];
      } else {
        state = value.state;
        data = value.data;
      }
      const tag = terse ? state : `notify ${state}`;
      switch (state) {
        case 'fulfilled':
        case 'rejected':
          p(`${prefix}${tag}: ${idx} ${pref(target)} := ${pdata(data)}`);
          break;
        default:
          p(`notify: unknown state "${state}"`);
          break;
      }
      idx += 1;
    }
  }

  function doDeliverDropRetire(delivery, prefix = '') {
    // prettier-ignore
    p(`${prefix}recv-${delivery[0]}: [${delivery[1].map(r => pref(r)).join(' ')}]`);
  }

  function doDeliver(delivery, prefix) {
    switch (delivery[0]) {
      case 'message':
        doDeliverMessage(delivery, prefix);
        break;
      case 'notify':
        doDeliverNotify(delivery, prefix);
        break;
      case 'dropExports':
      case 'retireExports':
      case 'retireImports':
        doDeliverDropRetire(delivery, prefix);
        break;
      default:
        p(`deliver: unknown deliver type "${delivery[0]}"`);
        break;
    }
  }

  function handleDeliver(entry) {
    doDeliver(kernelSpace ? entry.kd : entry.vd);
  }

  function handleDeliverResult(entry) {
    const [status, problem] = entry.dr;
    if (status !== 'ok') {
      p(`deliver-result: ${status} ${problem}`);
    }
  }

  function doSyscallSend(tag, entry) {
    const target = entry[1];
    let method;
    let args;
    let result;
    // annoying assymetry that's too hard to fix on the originating end
    if (kernelSpace) {
      method = entry[2].method;
      args = entry[2].args;
      result = entry[2].result;
    } else {
      method = entry[2];
      args = entry[3];
      result = entry[4];
    }
    p(`${tag}: ${pref(target)} <- ${method}(${pargs(args)}): ${pref(result)}`);
  }

  function doSyscallResolve(tag, entry) {
    let idx = 0;
    const resolutions = kernelSpace ? entry[2] : entry[1];
    for (const resolution of resolutions) {
      const [target, rejected, value] = resolution;
      const rejTag = rejected ? 'reject' : 'fulfill';
      p(`${tag} ${idx} ${rejTag}: ${pref(target)} = ${pdata(value)}`);
      idx += 1;
    }
  }

  function doSyscallInvoke(tag, entry) {
    p(`${tag}: ${pref(entry[1])}.${entry[2]}(${pargs(entry[3])})`);
  }

  function doSyscallSubscribe(tag, entry) {
    p(`${tag}: ${pref(kernelSpace ? entry[2] : entry[1])}`);
  }

  function doSyscallVatstoreDeleteOrGet(tag, entry) {
    const key = kernelSpace ? entry[2] : entry[1];
    p(`${tag}: '${key}' (${pref(key, false)})`);
  }

  function doSyscallVatstoreSet(tag, entry) {
    const key = kernelSpace ? entry[2] : entry[1];
    const value = kernelSpace ? entry[3] : entry[2];
    /*
    const data = JSON.parse(value);
    if (key.startsWith('ws')) {
      p(`${tag}: '${key}' (${pref(key, false)}) = ${pdata(data)}`);
    } else {
      const interp = {};
      for (const [id, val] of Object.entries(data)) {
        interp[id] = pdata(val);
      }
      p(`${tag}: '${key}' (${pref(key, false)}) = ${JSON.stringify(interp)}`);
    }
    */
    p(`${tag}: ${key} := '${value}'`);
  }

  function doSyscallDropRetire(tag, entry) {
    p(`send-${tag}: [${entry[1].map(r => pref(r)).join(' ')}]`);
  }

  function doSyscallExit(tag, entry) {
    const failure = kernelSpace ? entry[2] : entry[1];
    const value = kernelSpace ? entry[3] : entry[2];
    p(`${tag}: (${failure ? 'failure' : 'success'}) ${pdata(value)}`);
  }

  function doSyscall(syscall) {
    currentSyscallName = syscall[0];
    const tag = terse ? currentSyscallName : `syscall ${currentSyscallName}`;
    switch (currentSyscallName) {
      case 'exit':
        doSyscallExit(tag, syscall);
        break;
      case 'resolve':
        doSyscallResolve(tag, syscall);
        break;
      case 'invoke':
        doSyscallInvoke(tag, syscall);
        break;
      case 'send':
        doSyscallSend(tag, syscall);
        break;
      case 'subscribe':
        doSyscallSubscribe(tag, syscall);
        break;
      case 'vatstoreDelete':
      case 'vatstoreGet':
        doSyscallVatstoreDeleteOrGet(tag, syscall);
        break;
      case 'vatstoreSet':
        doSyscallVatstoreSet(tag, syscall);
        break;
      case 'dropImports':
      case 'retireExports':
      case 'retireImports':
        doSyscallDropRetire(tag, syscall);
        break;
      default:
        p(`syscall: unknown syscall ${currentSyscallName}`);
        break;
    }
  }

  function handleImportKernelStart(entry) {
    importKernelStartTime = entry.time;
  }

  function handleImportKernelFinish(entry) {
    p(`kernel-import: ${entry.time - importKernelStartTime}`);
  }

  function handleVatStartupStart(entry) {
    vatStartupStartTime = entry.time;
    vatStartupVat = entry.vatID;
  }

  function handleVatStartupFinish(entry) {
    // prettier-ignore
    if (entry.vatID !== vatStartupVat) {
      p(`vat-startup-finish vat ${entry.vatID} doesn't match vat-startup-start vat ${vatStartupVat}`);
    } else {
      p(`vat-startup: ${entry.vatID} ${entry.time - vatStartupStartTime}`);
    }
  }

  function handleReplayTranscriptStart(entry) {
    replayTranscriptStartTime = entry.time;
    replayTranscriptVat = entry.vatID;
    p(`replay-transcript-start: ${entry.vatID}`);
  }

  function handleReplayTranscriptFinish(entry) {
    // prettier-ignore
    if (entry.vatID !== replayTranscriptVat) {
      p(`replay-transcript-finish vat ${entry.vatID} doesn't match replay-transcript-start vat ${replayTranscriptVat}`);
    } else {
      p(`replay-transcript-finish: ${entry.vatID} ${entry.time - replayTranscriptStartTime}`);
    }
  }

  function handleStartReplay(entry) {
    replayStartTime = entry.time;
    replayVat = entry.vatID;
    p(`start-replay: ${entry.vatID} ${entry.deliveries}`);
  }

  function handleFinishReplay(entry) {
    // prettier-ignore
    if (entry.vatID !== replayVat) {
      p(`finish-replay vat ${entry.vatID} doesn't match start-replay vat ${replayVat}`);
    } else {
      p(`finish-replay ${entry.vatID} ${entry.time - replayStartTime}`);
    }
  }

  function handleStartReplayDelivery(entry) {
    replayDeliveryStartTime = entry.time;
    replayDeliveryVat = entry.vatID;
    replayDeliveryNum = entry.deliveryNum;
    replayDeliveryDelivery = entry.delivery;
  }

  function handleFinishReplayDelivery(entry) {
    // prettier-ignore
    if (entry.vatID !== replayDeliveryVat) {
      p(`finish-replay-delivery vat ${entry.vatID} doesn't match start-replay-delivery vat ${replayDeliveryVat}`);
    } else if (entry.deliveryNum !== replayDeliveryNum) {
      p(`finish-replay-delivery number ${entry.deliveryNum} doesn't match start-replay-delivery number ${replayDeliveryNum}`);
    } else {
      const prefix = `replay ${entry.vatID} ${entry.deliveryNum} ${entry.time - replayDeliveryStartTime} `;
      doDeliver(replayDeliveryDelivery, prefix);
    }
  }

  function handleCosmicSwingsetBeginBlock(entry) {
    cosmicSwingsetBeginBlockTime = entry.time;
    cosmicSwingsetBlockTime = entry.blockTime;
    cosmicSwingsetBlockHeight = entry.blockHeight;
    p(`cosmic-swingset-begin-block: ${entry.blockHeight} ${entry.blockTime}`);
  }

  function handleCosmicSwingsetEndBlockStart(entry) {
    cosmicSwingsetEndBlockStartTime = entry.time;
    // prettier-ignore
    if (entry.blockTime !== cosmicSwingsetBlockTime) {
      p(`cosmic-swingset-end-block-start time ${entry.blockTime} doesn't match cosmic-swingset-begin-block time ${cosmicSwingsetBlockTime}`);
    } else if (entry.blockHeight !== cosmicSwingsetBlockHeight) {
      p(`cosmic-swingset-end-block-start height ${entry.blockHeight} doesn't match cosmic-swingset-begin-block height ${cosmicSwingsetBlockHeight}`);
    } else {
      p(`cosmic-swingset-end-block-start`);
    }
  }

  function handleCosmicSwingsetEndBlockFinish(entry) {
    cosmicSwingsetEndBlockStartTime = entry.time;
    // prettier-ignore
    if (entry.blockTime !== cosmicSwingsetBlockTime) {
      p(`cosmic-swingset-end-block-finish time ${entry.blockTime} doesn't match cosmic-swingset-begin-block time ${cosmicSwingsetBlockTime}`);
    } else if (entry.blockHeight !== cosmicSwingsetBlockHeight) {
      p(`cosmic-swingset-end-block-finish height ${entry.blockHeight} doesn't match cosmic-swingset-begin-block height ${cosmicSwingsetBlockHeight}`);
    } else {
      p(`cosmic-swingset-end-block:  ${entry.blockHeight} ${entry.blockTime} ${cosmicSwingsetEndBlockStartTime - cosmicSwingsetBeginBlockTime}+${entry.time - cosmicSwingsetEndBlockStartTime}`);
    }
  }

  function handleCosmicSwingsetDeliverInbound(entry) {
    p(`cosmic-swingset-deliver-inbound: ${entry.count} ${entry.sender}`);
  }

  function handleSyscall(entry) {
    doSyscall(kernelSpace ? entry.ksc : entry.vsc);
  }

  function handleSyscallResult(entry) {
    const [status, value] = kernelSpace ? entry.ksr : entry.vsr;
    const tag = terse ? 'result' : `syscall-result ${currentSyscallName}`;
    if (status !== 'ok') {
      p(`${tag}: ${status} ${value}`);
    }
    switch (currentSyscallName) {
      case 'exit':
      case 'resolve':
      case 'send':
      case 'subscribe':
      case 'vatstoreDelete':
      case 'vatstoreSet':
      case 'dropImports':
      case 'retireExports':
      case 'retireImports':
        if (value !== null) {
          p(`${tag}: unexpected value ${value}`);
        }
        break;
      case 'invoke':
        p(`${tag}: ${pdata(value)}`);
        break;
      case 'vatstoreGet':
        p(`${tag}: '${value}'`);
        break;
      default:
        p(`syscall-result missing start of syscall`);
        break;
    }
  }

  function handleConsole(entry) {
    const { state, level, args } = entry;
    const tag = terse ? level : `console ${level} (${state})`;
    p(`${tag}: ${args.join(' ')}`);
  }

  function handleCList(entry) {
    if (argv.clist) {
      const { mode, vatID, kobj, vobj } = entry;
      const tag = terse ? mode : `clist ${mode}`;
      p(`${tag}: ${vatID}:${pref(vobj, false)} :: ${pref(kobj, true)}`);
    }
  }

  function handleTerminate(entry) {
    const { shouldReject, info } = entry;
    const reject = terse ? '!' : ' reject';
    const noReject = terse ? '' : ' no reject';
    const suffix = shouldReject ? reject : noReject;
    p(`terminate${suffix}: ${pdata(info)}`);
  }
}
