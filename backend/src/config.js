require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b ';
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL || '';
const NOTIFICATION_TYPE = process.env.NOTIFICATION_TYPE || 'generic';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// const openai = OPENAI_API_KEY ? new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY })) : null;

module.exports = {
  supabase,
//   openai,
  LLM_PROVIDER,
  OPENAI_MODEL,
  OLLAMA_URL,
  OLLAMA_MODEL,
  SERP_API_KEY,
  NOTIFICATION_WEBHOOK_URL,
  NOTIFICATION_TYPE,
};
