const { supabase } = require('../config');

async function createOutline(data) {
  const { error, data: result } = await supabase.from('book_outlines').insert(data).select().single();
  if (error) throw error;
  return result;
}

async function updateOutline(id, updates) {
  const { error, data: result } = await supabase.from('book_outlines').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

async function getOutlineById(id) {
  const { error, data } = await supabase.from('book_outlines').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

module.exports = {
  createOutline,
  updateOutline,
  getOutlineById,
};
