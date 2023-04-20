import { getCachedColonyClient } from './colonyClient';

export const getColonyTokenAddress = async (
  colonyAddress: string,
): Promise<string> => {
  const colonyClient = await getCachedColonyClient(colonyAddress);
  const tokenAddress = await colonyClient.getToken();
  return tokenAddress;
};