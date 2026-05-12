const { supabase } = require('../config');

async function createChapter(data) {
  const { error, data: result } = await supabase.from('chapters').insert(data).select().single();
  if (error) throw error;
  return result;
}

async function updateChapter(id, updates) {
  const { error, data: result } = await supabase.from('chapters').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

async function getChaptersByOutline(outlineId) {
  const { error, data } = await supabase.from('chapters').select('*').eq('outline_id', outlineId).order('chapter_index', { ascending: true });
  if (error) throw error;
  return data;
}

async function getPreviousSummaries(outlineId, chapterIndex) {
  const { error, data } = await supabase
    .from('chapters')
    .select('summary')
    .eq('outline_id', outlineId)
    .lt('chapter_index', chapterIndex)
    .order('chapter_index', { ascending: true });
  if (error) throw error;
  return data.map((row) => row.summary).filter(Boolean);
}

async function getChapterByOutlineAndIndex(outlineId, chapterIndex) {
  const { error, data } = await supabase
    .from('chapters')
    .select('*')
    .eq('outline_id', outlineId)
    .eq('chapter_index', chapterIndex)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function getChapterById(chapterId) {
  const { error, data } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
  if (error) throw error;
  return data;
}

module.exports = {
  createChapter,
  updateChapter,
  getChaptersByOutline,
  getPreviousSummaries,
  getChapterByOutlineAndIndex,
  getChapterById,
};
