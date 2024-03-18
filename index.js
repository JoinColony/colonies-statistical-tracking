require('dotenv').config();
const fetch = require('node-fetch');
const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const keccak256 = require('keccak256');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: SCOPES,
});

const spreadsheet = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

const ExtensionNameMapping = {
  OneTxPayment: `0x${keccak256('OneTxPayment').toString('hex')}`,
  VotingReputation: `0x${keccak256('VotingReputation').toString('hex')}`,
};

const updateStatusSheet = async (statusSheet, message) => {
  await statusSheet.loadCells('A1:A2');
  const dateCell = statusSheet.getCell(0, 0);
  const textCell = statusSheet.getCell(1, 0);
  dateCell.value = new Date().toISOString();
  textCell.value = message;
  await statusSheet.saveUpdatedCells();
};

const graphqlRequest = async (queryOrMutation, variables, url = process.env.AWS_APPSYNC_ENDPOINT, authKey = process.env.AWS_APPSYNC_KEY) => {
  const options = {
    method: 'POST',
    headers: {
      'x-api-key': authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queryOrMutation,
      variables,
    }),
  };

  let body;
  let response;

  try {
    response = await fetch(url, options);
    body = await response.json();
    return body;
  } catch (error) {
    /*
     * Something went wrong... obviously
     */
    console.error(error);
    return null;
  }
};

const getAllColonies = /* GraphQL */ `
  query GetAllColonies($nextToken: String) {
    listColonies(limit: 20, nextToken: $nextToken) {
      items {
        name
        colonyAddress: id
        nativeToken {
          tokenAddress: id
          name
          symbol
        }
        version
        createdAt
        extensions {
          items {
            extensionAddress: id
            version
            hash
            installedAt: createdAt
          }
        }
        metadata {
          description
          displayName
        }
      }
      nextToken
    }
  }
`;

(async () => {

  await spreadsheet.loadInfo();
  const dataSheet = spreadsheet.sheetsByIndex[0];
  const statusSheet = spreadsheet.sheetsByIndex[1];

  try {
    // knows about header row
    const rows = await dataSheet.getRows();

    const knownColonyNames = rows.map(row => row.get('Colony Name'));

    let allColoniesInDB = [];
    let nextToken = null;

    do {
      let queryInput = {};
      if (nextToken) {
        queryInput = { nextToken };
      }
      const allColoniesInDBQuery = await graphqlRequest(getAllColonies, queryInput);

      const colonies = allColoniesInDBQuery.data.listColonies.items;

      if (colonies.length === 0) {
        break;
      }


      allColoniesInDB.push(...colonies);
      const coloniesNames = colonies.map(colony => colony.name);

      nextToken = allColoniesInDBQuery.data.listColonies.nextToken;
    } while (nextToken);

    const allColoniesInDBNames = allColoniesInDB.map(colony => colony.name);
    const coloniesToProcess = allColoniesInDBNames.filter(colonyName => !knownColonyNames.includes(colonyName));

    // !Careful with the heading title, as capitalization matters, even if not the first character!
    const newSheetData = coloniesToProcess.map(colonyName => {
      const colony = allColoniesInDB.find(item => item.name === colonyName);
      const oneTxPaymentExtension = colony.extensions.items.find(extension => extension.hash === ExtensionNameMapping.OneTxPayment);
      const votinReputationExtension = colony.extensions.items.find(extension => extension.hash === ExtensionNameMapping.VotingReputation);

      let rowUpdate = {
        'Colony Name': colony.name,
        'Colony Address': colony.colonyAddress,
        'Colony Display Name': colony.metadata.displayName || 'N/A',
        'Colony Description': colony.metadata.description,
        'Native Token Name': colony.nativeToken.name,
        'Native Token Symbol': colony.nativeToken.symbol,
        'Native Token Address': colony.nativeToken.tokenAddress,
        'Colony Version': colony.version,
        'Created at': colony.createdAt,
      };

      if (oneTxPaymentExtension) {
        rowUpdate = {
          ...rowUpdate,
          'OneTx Address': oneTxPaymentExtension.extensionAddress,
          'OneTx Version': oneTxPaymentExtension.version,
        };
      }

      if (votinReputationExtension) {
        rowUpdate = {
          ...rowUpdate,
          'VotingRep Address': votinReputationExtension.extensionAddress,
          'VotingRep Version': votinReputationExtension.version,
          'VotingRep InstalledAt': votinReputationExtension.installedAt,
        };
      }

      return rowUpdate;
    });

    await dataSheet.addRows(newSheetData);

    await updateStatusSheet(statusSheet, coloniesToProcess.length > 0 ? `Successfully added ${coloniesToProcess.length} colonies` : 'Successfully updated');
  } catch (error) {
    await updateStatusSheet(statusSheet, `Error: ${error.message}`);
  }




})();
