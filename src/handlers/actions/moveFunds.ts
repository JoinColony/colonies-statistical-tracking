import {
  AnyColonyClient,
  ColonyClientV1,
  ColonyClientV2,
  ColonyClientV3,
  ColonyClientV4,
} from '@colony/colony-js';
import { BigNumber, utils } from 'ethers';

import {
  ColonyActionType,
  ContractEvent,
  ContractEventsSignatures,
} from '~types';
import {
  toNumber,
  writeActionFromEvent,
  getDomainDatabaseId,
  verbose,
  getCachedColonyClient,
} from '~utils';
import provider from '~provider';

/**
 * The handler makes use of colonyClient getDomainFromFundingPot method which is only
 * available on ColonyClientV5 and above. The following type predicate allows to check
 * we're dealing with a client that supports this method
 */
type SupportedColonyClient = Exclude<
  AnyColonyClient,
  ColonyClientV1 | ColonyClientV2 | ColonyClientV3 | ColonyClientV4
>;
const isSupportedColonyClient = (
  colonyClient: AnyColonyClient,
): colonyClient is SupportedColonyClient =>
  (colonyClient as SupportedColonyClient).getDomainFromFundingPot !== undefined;

export default async (event: ContractEvent): Promise<void> => {
  const receipt = await provider.getTransactionReceipt(event.transactionHash);
  const hasPaymentAddedEvent = receipt.logs.some((log) =>
    log.topics.includes(utils.id(ContractEventsSignatures.PaymentAdded)),
  );

  if (hasPaymentAddedEvent) {
    verbose(
      'Not acting upon the ColonyFundsMovedBetweenFundingPots event as a PaymentAdded event was present in the same transaction',
    );
    return;
  }

  const { contractAddress: colonyAddress } = event;
  const {
    agent: initiatorAddress,
    token: tokenAddress,
    amount,
    fromPot,
    toPot,
  } = event.args;

  const colonyClient = await getCachedColonyClient(colonyAddress);
  let fromDomainId: BigNumber | undefined;
  let toDomainId: BigNumber | undefined;
  if (isSupportedColonyClient(colonyClient)) {
    fromDomainId = await colonyClient.getDomainFromFundingPot(fromPot);
    toDomainId = await colonyClient.getDomainFromFundingPot(toPot);
  }

  await writeActionFromEvent(event, colonyAddress, {
    type: ColonyActionType.MoveFunds,
    initiatorAddress,
    tokenAddress,
    amount: amount.toString(),
    fromDomainId: fromDomainId
      ? getDomainDatabaseId(colonyAddress, toNumber(fromDomainId))
      : undefined,
    toDomainId: toDomainId
      ? getDomainDatabaseId(colonyAddress, toNumber(toDomainId))
      : undefined,
  });
};