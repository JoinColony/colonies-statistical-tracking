require('dotenv').config();
const fetch = require('node-fetch');
const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const keccak256 = require('keccak256');

const DEFAULT_TIMEOUT = 300;
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
  [keccak256('OneTxPayment').toString('hex')]: 'OneTxPayment',
  [keccak256('VotingReputation').toString('hex')]: 'VotingReputation',
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
  query GetAllColonies {
    listColonies {
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
            id
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

    const allColoniesInDBQuery = await graphqlRequest(getAllColonies);

    const allColoniesInDB = allColoniesInDBQuery.data.listColonies.items.map(item => item.name);

    const coloniesToProcess = allColoniesInDB.filter(colonyName => !knownColonyNames.includes(colonyName));

    // !Careful with the heading title, as capitalization matters, even if not the first character!
    const newSheetData = coloniesToProcess.map(colonyName => {
      const colony = allColoniesInDBQuery.data.listColonies.items.find(item => item.name === colonyName);
      return {
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
    });

    await dataSheet.addRows(newSheetData);

  } catch (error) {
    await statusSheet.loadCells('A1:A1');
    const firstCell = statusSheet.getCell(0, 0);
    firstCell.value = `Error: ${error.message}`;
    await statusSheet.saveUpdatedCells()
  }




})();
