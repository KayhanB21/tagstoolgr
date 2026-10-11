// Collect every page before modifying messages, since tagging can change a filtered view.
export async function collectIds(api, page) {
  const ids = new Set();
  while (page) {
    for (const message of page.messages) ids.add(message.id);
    page = page.id ? await api.continueList(page.id) : null;
  }
  return [...ids];
}

export async function updateTags(api, ids, mode, keys) {
  if (!['add', 'replace', 'clear'].includes(mode)) throw new Error('Unknown tag action.');
  if (!Array.isArray(keys) || !keys.every(key => typeof key === 'string')) throw new Error('Invalid tags.');
  if (mode !== 'clear' && !keys.length) throw new Error('Choose at least one tag.');
  if (!ids.length) throw new Error('Select messages in the message list first.');
  if (mode !== 'clear') {
    const available = new Set((await api.tags.list()).map(tag => tag.key));
    if (keys.some(key => !available.has(key))) throw new Error('A chosen tag was deleted. Reopen TagsToolGR and choose again.');
  }
  const result = {updated: 0, failed: 0, errors: []};
  for (const id of new Set(ids)) {
    try {
      // Re-read before adding so tags applied since opening the picker are preserved.
      const current = mode === 'add' ? (await api.get(id)).tags : [];
      const tags = mode === 'clear' ? [] : [...new Set([...current, ...keys])];
      await api.update(id, {tags});
      result.updated++;
    } catch (error) {
      result.failed++;
      if (result.errors.length < 3) result.errors.push(String(error.message || error));
    }
  }
  return result;
}
