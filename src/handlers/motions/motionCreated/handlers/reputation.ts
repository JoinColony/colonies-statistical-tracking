import { TransactionDescription } from 'ethers/lib/utils';
import { ContractEvent, motionNameMapping } from '~types';
import { getDomainDatabaseId } from '~utils';

import { createMotionInDB } from '../helpers';

export const handleDomainEditReputationMotion = async (
  event: ContractEvent,
  parsedAction: TransactionDescription,
): Promise<void> => {
  const { contractAddress: colonyAddress } = event;
  const { name, args: actionArgs } = parsedAction;
  const [domainId, userAddress, amount] = actionArgs.slice(-3);
  await createMotionInDB(event, {
    type: motionNameMapping[name],
    recipientAddress: userAddress,
    amount: amount.toString(),
    fromDomainId: getDomainDatabaseId(colonyAddress, domainId),
  });
};