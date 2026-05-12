const axios = require('axios');
const { SERP_API_KEY } = require('../config');

async function searchWeb(query) {
  if (!SERP_API_KEY) {
    throw new Error('SERP_API_KEY is not configured.');
  }

  const url = 'https://serpapi.com/search.json';
  const params = {
    q: query,
    engine: 'google',
    api_key: SERP_API_KEY,
    num: 5,
    hl: 'en',
  };

  const response = await axios.get(url, { params, timeout: 20000 });
  return response.data;
}

function buildSourceContext(searchResults) {
  const organic = (searchResults.organic_results || []).slice(0, 4);
  return organic
    .map((item, index) => `Source ${index + 1}: ${item.title || item.link}\n${item.snippet || ''}\n${item.link || ''}`)
    .join('\n\n');
}

module.exports = {
  searchWeb,
  buildSourceContext,
};
