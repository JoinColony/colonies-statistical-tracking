import { Extension, getExtensionHash, getLogs } from '@colony/colony-js';

// import { extensionSpecificEventsListener } from './eventListener';
import networkClient from './networkClient';
import {
  mapLogToContractEvent,
  verbose,
  writeExtensionVersionFromEvent,
} from './utils';
import { SUPPORTED_EXTENSION_IDS } from './constants';
import stats from '../run/stats.json';
import { addEvent } from './eventQueue';

export default async (): Promise<void> => {
  const latestBlock = stats.latestBlock ?? 0;

  SUPPORTED_EXTENSION_IDS.forEach(async (extensionId) => {
    verbose(
      `Fetching current version of extension: ${extensionId} starting from block: ${latestBlock}`,
    );
    await trackExtensionAddedToNetwork(extensionId, latestBlock);

    verbose(
      `Fetching events for extension: ${extensionId} starting from block: ${latestBlock}`,
    );
    await trackExtensionEvents(extensionId, latestBlock);
  });
};

const trackExtensionAddedToNetwork = async (
  extensionId: string,
  latestBlock: number,
): Promise<void> => {
  const extensionHash = getExtensionHash(extensionId);
  const extensionAddedToNetworkLogs = await getLogs(
    networkClient,
    networkClient.filters.ExtensionAddedToNetwork(extensionHash),
    { fromBlock: latestBlock },
  );

  // Only interested in the most recent one which contains the newest version
  const mostRecentLog =
    extensionAddedToNetworkLogs[extensionAddedToNetworkLogs.length - 1];
  if (!mostRecentLog) {
    return;
  }

  const event = await mapLogToContractEvent(
    mostRecentLog,
    networkClient.interface,
  );
  if (!event) {
    return;
  }

  writeExtensionVersionFromEvent(event);
};

const trackExtensionEvents = async (
  extensionId: Extension,
  latestBlock: number,
): Promise<void> => {
  const extensionHash = getExtensionHash(extensionId);
  const filters = [
    networkClient.filters.ExtensionInstalled(extensionHash),
    networkClient.filters.ExtensionUninstalled(extensionHash),
    networkClient.filters.ExtensionUpgraded(extensionHash),
    networkClient.filters.ExtensionDeprecated(extensionHash),
  ];

  const allLogs = (
    await Promise.all(
      filters.map(async (filter) => {
        const logs = await getLogs(networkClient, filter, {
          fromBlock: latestBlock,
        });

        return logs;
      }),
    )
  ).flat();

  // Sort the logs in chronological order
  allLogs.sort((a, b) => a.blockNumber - b.blockNumber);

  allLogs.forEach(async (log) => {
    const event = await mapLogToContractEvent(log, networkClient.interface);
    if (!event) {
      return;
    }
    addEvent(event);
  });

  // /**
  //  * Looping through the logs to create a mapping between colonies
  //  * and the number of extension installations we encounter, minus uninstallations
  //  */
  // const installedInColonyCount: { [address: string]: number } = {};
  // extensionInstalledLogs.forEach((log) => {
  //   const parsedLog = networkClient.interface.parseLog(log);
  //   const { colony } = parsedLog.args;

  //   if (colony in installedInColonyCount) {
  //     installedInColonyCount[colony]++;
  //   } else {
  //     installedInColonyCount[colony] = 1;
  //   }
  // });
  // extensionUninstalledLogs.forEach((log) => {
  //   const parsedLog = networkClient.interface.parseLog(log);
  //   const { colony } = parsedLog.args;

  //   if (colony in installedInColonyCount) {
  //     installedInColonyCount[colony]--;
  //   }
  // });

  // for (const [colony, installationsCount] of Object.entries(
  //   installedInColonyCount,
  // )) {
  //   /**
  //    * If installation count is 0, that means the extension has been deleted
  //    */
  //   if (installationsCount <= 0) {
  //     const mostRecentUninstalledLog =
  //       extensionUninstalledLogs[extensionUninstalledLogs.length - 1];
  //     if (!mostRecentUninstalledLog) {
  //       return;
  //     }

  //     const event = await mapLogToContractEvent(
  //       mostRecentUninstalledLog,
  //       networkClient.interface,
  //     );
  //     if (!event) {
  //       return;
  //     }

  //     await deleteExtensionFromEvent(event);
  //   } else {
  //     const extensionAddress = await networkClient.getExtensionInstallation(
  //       extensionHash,
  //       colony,
  //     );

  //     // Listen to extension specific events (e.g. ExtensionInitialised)
  //     await extensionSpecificEventsListener(extensionAddress, extensionHash);

  //     // Store the most recent installation in the db
  //     const mostRecentInstalledLog =
  //       extensionInstalledLogs[extensionInstalledLogs.length - 1];
  //     const event = await mapLogToContractEvent(
  //       mostRecentInstalledLog,
  //       networkClient.interface,
  //     );

  //     if (!event) {
  //       return;
  //     }

  //     /**
  //      * Get the currently installed version of extension
  //      * (so we don't have to worry about ExtensionUpgraded events)
  //      */
  //     const version = await (
  //       await (
  //         await networkClient.getColonyClient(colony)
  //       ).getExtensionClient(extensionId)
  //     ).version();
  //     const convertedVersion = toNumber(version);

  //     const isDeprecated = await isExtensionDeprecated(
  //       extensionHash,
  //       colony,
  //       mostRecentInstalledLog,
  //     );

  //     const isInitialised = await isExtensionInitialised(
  //       extensionAddress,
  //       mostRecentInstalledLog,
  //     );

  //     await writeExtensionFromEvent(
  //       event,
  //       extensionAddress,
  //       convertedVersion,
  //       isDeprecated,
  //       isInitialised,
  //     );
  //   }
  // }
};
