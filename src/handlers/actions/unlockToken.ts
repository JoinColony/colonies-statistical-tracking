import { Id } from '@colony/colony-js';
import { ColonyActionType } from '~graphql';
import { ContractEvent } from '~types';
import {
  writeActionFromEvent,
  getDomainDatabaseId,
  getCachedColonyClient,
} from '~utils';

export default async (event: ContractEvent): Promise<void> => {
  const { contractAddress: colonyAddress } = event;
  const { agent: initiatorAddress } = event.args;

  const colonyClient = await getCachedColonyClient(colonyAddress);

  if (colonyClient) {
    const tokenAddress = await colonyClient.getToken();

    await writeActionFromEvent(event, colonyAddress, {
      type: ColonyActionType.UnlockToken,
      initiatorAddress,
      tokenAddress,
      fromDomainId: getDomainDatabaseId(colonyAddress, Id.RootDomain),
    });
  }
};
