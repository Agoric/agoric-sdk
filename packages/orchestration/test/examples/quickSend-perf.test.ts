/**
 * advance parameters:
rate of new requests per block
distribution of requests over unique addresses (uniform vs. power-law(b))
delay, in blocks, between CCTP request and noble mint (for settlement)
background work, unrelated to Fast USDC
probably assume 0, at least initially
￼￼
￼￼
￼￼
￼
￼
NEW￼
￼
1:49
resulting measurements:
maximum sustainable load at steady state
#blocks to recover from unsustainably high load
 */

const runSim = async ({ fanout, mintDelay }) => {
  let maxSustainable;

  // TODO: mintDelay
  for (let rate = 1; ; rate += 1) {
    const something = scheduleReports(rate, fanout);
    scheduleMints(something);
    const policy = computronCounter(); // see line 266 of launch-chain.js
    const leftover = controller.run(); // runKernel / handleNextBlock
    if (leftover.length > 0) {
      maxSustainable = rate;
      break;
    }
  }

  return { maxSustainable, recoveryBlocks };
};
