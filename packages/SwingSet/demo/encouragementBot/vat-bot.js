export function buildRootObject(vatPowers) {
  return harden({
    encourageMe(name) {
      vatPowers.testLog(
        `=> encouragementBot.encourageMe got the name: ${name}`,
      );
      return `${name}, you are awesome, keep it up!`;
    },
  });
}
