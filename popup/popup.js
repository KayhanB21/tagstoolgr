const $ = id => document.getElementById(id);
let token;
let busy = false;
let count = 0;
const checked = () => [...document.querySelectorAll('#tags input:checked')].map(input => input.value);
function refresh() {
  $('controls').disabled = busy || !count;
  $('apply').disabled = busy || !count || !checked().length;
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function report(result) {
  status(`${result.updated} message${result.updated === 1 ? '' : 's'} updated.${result.failed ? ` ${result.failed} failed. ${result.errors.join(' ')}` : ''}`, !!result.failed);
}
async function request(message) {
  const reply = await browser.runtime.sendMessage(message);
  if (reply.error) throw new Error(reply.error);
  return reply.value;
}
async function init() {
  const params = new URLSearchParams(location.search);
  if (params.has('error')) throw new Error(params.get('error'));
  let data;
  if (params.has('context')) data = await request({type: 'load', token: params.get('context')});
  else {
    const [tab] = await browser.mailTabs.query({active: true, currentWindow: true});
    if (!tab) throw new Error('Open a mail tab and select messages first.');
    data = await request({type: 'prepare', tabId: tab.id});
  }
  token = data.token;
  count = data.count;
  $('selection').textContent = count ? `${count} message${count === 1 ? '' : 's'} selected` : 'Select messages in the message list first.';
  for (const tag of data.tags) {
    const label = document.createElement('label');
    label.className = 'tag';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = tag.key;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = tag.color;
    swatch.setAttribute('aria-hidden', 'true');
    label.append(input, swatch, document.createTextNode(tag.tag));
    $('tags').append(label);
  }
  $('empty').hidden = !!data.tags.length;
  $('tags').hidden = !data.tags.length;
  if (data.result) report(data.result);
  refresh();
}
async function apply(mode) {
  if (busy) return;
  busy = true;
  refresh();
  status(`Updating ${count} message${count === 1 ? '' : 's'}…`);
  try { report(await request({type: 'apply', token, mode, keys: checked()})); }
  catch (error) { status(error.message, true); }
  finally { busy = false; refresh(); }
}
$('tags').addEventListener('change', refresh);
$('mode').addEventListener('change', () => {
  $('hint').textContent = $('mode').value === 'replace' ? 'All existing tags will be replaced by your choices.' : 'Existing tags will be kept.';
  $('apply').textContent = $('mode').value === 'replace' ? 'Replace tags' : 'Apply tags';
});
$('form').addEventListener('submit', event => { event.preventDefault(); void apply($('mode').value); });
$('clear').addEventListener('click', () => { void apply('clear'); });
init().catch(error => { $('selection').textContent = 'Tags unavailable'; status(error.message, true); });
