const axios = require('axios');

async function searchWeb(query, apiKey) {
  const url = 'https://serpapi.com/search.json';
  const params = {
    q: query,
    engine: 'google',
    api_key: apiKey,
    num: 5,
    hl: 'en',
  };

  const response = await axios.get(url, { params, timeout: 20000 });
  return response.data;
}

function buildChapterDraft(title, outline, searchResults) {
  const hits = [];
  const organic = (searchResults.organic_results || []).slice(0, 4);

  for (const item of organic) {
    hits.push({
      title: item.title || item.link || 'Source',
      snippet: item.snippet || '',
      link: item.link || '',
    });
  }

  const intro = `## Chapter Draft: ${title}\n\n`;
  const overview = `This draft chapter is built from a web exploration of the chapter title and outline. It uses top search results to surface important concepts, examples, and structure for a human-approved chapter.\n\n`;
  const outlineSection = outline
    ? `### Outline context\n${outline.trim()}\n\n`
    : '';

  const sourceSummary = hits
    .map((item, index) => `- Source ${index + 1}: ${item.title}\n  ${item.snippet}\n  ${item.link}`)
    .join('\n\n');

  const generated = `### Key ideas from search results\n${hits
    .map((item, index) => `${index + 1}. ${item.title}: ${item.snippet}`)
    .join('\n\n')}\n\n`;

  const structure = `### Draft structure\n1. Introduction\n2. Core concepts and definitions\n3. Examples and practical guidance\n4. Summary and next steps\n\n`;

  const body = [intro, overview, outlineSection, generated, structure].join('');

  return {
    draft: body,
    sources: hits,
  };
}

module.exports = { searchWeb, buildChapterDraft };
