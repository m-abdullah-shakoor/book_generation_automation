const { supabase } = require('../config');

async function createFinalDraft(data) {
  const { error, data: result } = await supabase.from('final_books').insert(data).select().single();
  if (error) throw error;
  return result;
}

async function updateFinalDraft(id, updates) {
  const { error, data: result } = await supabase.from('final_books').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

async function getFinalByOutline(outlineId) {
  const { error, data } = await supabase.from('final_books').select('*').eq('outline_id', outlineId).single();
  if (error) throw error;
  return data;
}

module.exports = {
  createFinalDraft,
  updateFinalDraft,
  getFinalByOutline,
};
