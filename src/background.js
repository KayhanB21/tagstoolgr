import {collectIds, updateTags} from './tags.js';

// Serialize edits across windows to prevent two add operations losing each other's tags.
let edits = Promise.resolve();
function enqueue(task) {
  const next = edits.then(task);
  edits = next.catch(() => {});
  return next;
}
async function saveContext(ids) {
  const stored = await browser.storage.session.get(null);
  const expired = Object.entries(stored).filter(([, value]) => Date.now() - value.created > 3600000).map(([key]) => key);
  if (expired.length) await browser.storage.session.remove(expired);
  const token = crypto.randomUUID();
  await browser.storage.session.set({[token]: {ids, created: Date.now()}});
  return token;
}
async function context(token) {
  const value = (await browser.storage.session.get(token))[token];
  if (!value || Date.now() - value.created > 3600000) throw new Error('This selection expired. Reopen TagsToolGR.');
  return value;
}
async function run(token, mode, keys) {
  return enqueue(async () => {
    const value = await context(token);
    const result = await updateTags(browser.messages, value.ids, mode, keys);
    await browser.storage.session.set({[token]: {...value, result}});
    return result;
  });
}
async function handle(request) {
  if (request.type === 'prepare') {
    const ids = await collectIds(browser.messages, await browser.mailTabs.getSelectedMessages(request.tabId));
    const token = await saveContext(ids);
    return {token, count: ids.length, tags: await browser.messages.tags.list()};
  }
  if (request.type === 'load') {
    const value = await context(request.token);
    return {token: request.token, count: value.ids.length, tags: await browser.messages.tags.list(), result: value.result};
  }
  if (request.type === 'apply') return run(request.token, request.mode, request.keys);
  throw new Error('Unknown request.');
}
browser.runtime.onMessage.addListener((request, sender) => {
  if (sender.id !== browser.runtime.id) return;
  return handle(request).then(value => ({value}), error => ({error: error.message}));
});

function createMenu(properties) {
  browser.menus.create({contexts: ['message_list'], ...properties});
}
async function rebuildMenus() {
  await browser.menus.removeAll();
  createMenu({id: 'root', title: 'TagsToolGR', contexts: ['message_list']});
  createMenu({id: 'choose', parentId: 'root', title: 'Choose tags…'});
  createMenu({id: 'add', parentId: 'root', title: 'Add tag'});
  for (const tag of await browser.messages.tags.list()) {
    createMenu({id: `tag:${tag.key}`, parentId: 'add', title: tag.tag.replaceAll('&', '&&')});
  }
  createMenu({id: 'separator', parentId: 'root', type: 'separator'});
  createMenu({id: 'clear', parentId: 'root', title: 'Clear all tags'});
}
let menuWork = Promise.resolve();
function refreshMenus() {
  menuWork = menuWork.then(rebuildMenus).catch(console.error);
}
browser.runtime.onInstalled.addListener(refreshMenus);
browser.runtime.onStartup.addListener(refreshMenus);
browser.messages.tags.onCreated.addListener(refreshMenus);
browser.messages.tags.onDeleted.addListener(refreshMenus);
browser.messages.tags.onUpdated.addListener(refreshMenus);

browser.menus.onClicked.addListener(async info => {
  if (info.menuItemId !== 'choose' && info.menuItemId !== 'clear' && !String(info.menuItemId).startsWith('tag:')) return;
  let token;
  try {
    const ids = await collectIds(browser.messages, info.selectedMessages);
    token = await saveContext(ids);
    if (info.menuItemId !== 'choose') {
      const result = await run(token, info.menuItemId === 'clear' ? 'clear' : 'add', info.menuItemId === 'clear' ? [] : [info.menuItemId.slice(4)]);
      if (!result.failed) return;
    }
    await browser.windows.create({url: browser.runtime.getURL(`popup/popup.html?context=${token}`), type: 'popup', width: 390, height: 580});
  } catch (error) {
    console.error(error);
    await browser.windows.create({url: browser.runtime.getURL(`popup/popup.html?error=${encodeURIComponent(error.message)}`), type: 'popup', width: 390, height: 300});
  }
});
