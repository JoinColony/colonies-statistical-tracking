require('dotenv').config();
const fetch = require('node-fetch');

const DEFAULT_TIMEOUT = 300;

const delay = (ms = DEFAULT_TIMEOUT, verbose = false) =>
  new Promise((resolve) =>
    setTimeout(() => {
      if (verbose) {
        console.log(`Delaying execution by ${ms} milliseconds`);
      }
      resolve();
    }, ms),
  );

const graphqlRequest = async (queryOrMutation, variables, url, authKey) => {
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

const tryFetchGraphqlQuery = async (
  queryOrMutation,
  variables,
  maxRetries = 10,
  blockTime = 5000,
) => {
  let currentTry = 0;
  while (true) {
    const { data } = await graphqlRequest(
      queryOrMutation,
      variables,
      process.env.AWS_APPSYNC_ENDPOINT,
      process.env.AWS_APPSYNC_KEY,
    );

    /*
     * @NOTE That this limits to only fetching one operation at a time
     */
    if (data[Object.keys(data)[0]]) {
      return data[Object.keys(data)[0]];
    }

    if (currentTry < maxRetries) {
      await delay(blockTime);
      currentTry += 1;
    } else {
      console.log(data);
      throw new Error('Could not fetch graphql data in time');
    }
  }
};
