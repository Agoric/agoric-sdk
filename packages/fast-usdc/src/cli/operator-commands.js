/**
 * @import {Command} from 'commander';
 */

/**
 * @param {Command} program
 */
export const addOperatorCommands = program => {
  const operator = program
    .command('operator')
    .description('Oracle operator commands');

  operator
    .command('accept')
    .description('Accept invitation to be an operator')
    .action(async options => {
      const { requestId } = options;
      console.error('TODO: Implement accept logic for request:', requestId);
    });

  operator
    .command('attest')
    .description('Attest to an observed Fast USDC transfer')
    .requiredOption('--previousOfferId <string>', 'Offer id', String)
    .action(async options => {
      const { previousOfferId } = options;
      console.error(
        'TODO: Implement attest logic for request:',
        previousOfferId,
      );
    });

  return operator;
};
