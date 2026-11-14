const API_URL = 'https://portal.kidztech.edubeta.net.ng/tutor/schedule/today';
const $ = (id) => document.getElementById(id);
const state = { classes: [], title: "This Week's Classes", total: 0, lastUpdated: null, reminders: true, notified: new Set() };
let installPrompt = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function parseDate(dateText) {
  // API date format: Sunday, Nov 08, 2026
  const d = new Date(`${dateText} 12:00:00 GMT+0100`);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const match = String(dateText).match(/([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/);
  if (!match) return '';
  const month = new Date(`${match[1]} 1, ${match[3]}`).getMonth()+1;
  return `${match[3]}-${String(month).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`;
}
function parseTime(timeText) {
  const m = String(timeText || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '';
  let hour = Number(m[1]) % 12; if (m[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2,'0')}:${m[2]}`;
}
function startDateTime(item) {
  const date = item.isoDate || parseDate(item.date);
  const time = parseTime(item.time);
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+01:00`);
}
function validMeetLink(link) {
  try { const u = new URL(link); return u.protocol === 'https:' && u.hostname === 'meet.google.com' && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(u.pathname); }
  catch { return false; }
}
function normalizeClass(item, index) {
  const meet = String(item.meet_link || '').trim();
  const date = String(item.date || '').trim();
  const time = String(item.time || '').trim();
  return {
    id: `${item.student || 'student'}-${parseDate(date)}-${parseTime(time)}-${index}`,
    student: String(item.student || 'Scheduled student'), date, isoDate: parseDate(date), time,
    duration: String(item.duration || 'Duration not provided'), status: item.status || 'Scheduled', meetLink: meet,
    startAt: startDateTime({date, time})
  };
}
function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Lagos', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
}
function formatDate(date) {
  return new Intl.DateTimeFormat('en-NG', {weekday:'long', day:'numeric', month:'short', timeZone:'Africa/Lagos'}).format(date);
}
function formatCountdown(ms) {
  if (ms <= 0) return 'Starting / in progress';
  const mins = Math.floor(ms / 60000), days = Math.floor(mins / 1440), hours = Math.floor((mins % 1440) / 60), rest = mins % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${rest}m`;
  return `${rest}m`;
}
function sortedClasses() { return [...state.classes].sort((a,b) => (a.startAt?.getTime() || 0) - (b.startAt?.getTime() || 0)); }
function render() {
  const today = getTodayKey();
  const now = Date.now();
  const all = sortedClasses();
  const todayClasses = all.filter(c => c.isoDate === today);
  const next = all.find(c => c.startAt && c.startAt.getTime() > now && (!c.status || !/held|cancel/i.test(c.status)));
  $('totalCount').textContent = state.total || all.length;
  $('todayCount').textContent = todayClasses.length;
  $('nextCountdown').textContent = next ? formatCountdown(next.startAt.getTime()-now) : 'No upcoming';
  $('scheduleTitle').textContent = `${state.title} · ${all.length} loaded`;
  $('connectionText').textContent = state.lastUpdated ? `Last updated ${new Intl.DateTimeFormat('en-NG',{hour:'numeric',minute:'2-digit'}).format(state.lastUpdated)}. ${API_URL}` : API_URL;
  const filter = $('dayFilter').value;
  let visible = all;
  if (filter === 'today') visible = todayClasses;
  if (filter === 'upcoming') visible = all.filter(c => c.isoDate >= today);
  const list = $('scheduleList');
  if (!visible.length) {
    list.innerHTML = `<div class="empty"><strong>No classes in this view</strong><span>${filter === 'today' ? 'The API did not return a class for today.' : 'Try another day filter or refresh the schedule.'}</span></div>`;
    return;
  }
  const groups = new Map();
  for (const c of visible) { const key = c.isoDate || c.date || 'Other'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c); }
  list.innerHTML = [...groups.entries()].map(([key, classes]) => {
    const groupDate = classes[0].startAt ? formatDate(classes[0].startAt) : classes[0].date;
    const isToday = key === today;
    return `<section class="day-group"><div class="day-heading"><h3>${escapeHtml(groupDate)}</h3>${isToday ? '<span class="today-pill">TODAY</span>' : `<span>${classes.length} ${classes.length===1?'class':'classes'}</span>`}</div>
      ${classes.map(c => {
        const held = /held|cancel/i.test(c.status);
        const statusClass = held ? 'status-held' : (/complete|attend/i.test(c.status) ? 'status-done' : 'status-scheduled');
        const countdown = c.startAt ? (c.startAt.getTime() > now ? `Starts in ${formatCountdown(c.startAt.getTime()-now)}` : 'Scheduled time reached') : '';
        return `<article class="class-card ${held?'muted-card':''}"><div class="class-time"><strong>${escapeHtml(c.time)}</strong><span>${escapeHtml(c.duration)}</span></div><div class="class-main"><strong>${escapeHtml(c.student)}</strong><div class="class-meta"><span class="status ${statusClass}">${escapeHtml(c.status)}</span>${countdown ? `<span>${escapeHtml(countdown)}</span>`:''}</div></div>${validMeetLink(c.meetLink) && !held ? `<a class="join-btn" href="${escapeHtml(c.meetLink)}" target="_blank" rel="noopener noreferrer">Join Meet ↗</a>` : `<span class="no-meet">${held?'Not held':'No Meet link'}</span>`}</article>`;
      }).join('')}</section>`;
  }).join('');
}
function showError(message) { $('errorBox').textContent = message; $('errorBox').hidden = false; }
function clearError() { $('errorBox').hidden = true; $('errorBox').textContent = ''; }
function showInfo(message) { $('infoBox').textContent = message; $('infoBox').hidden = false; }
function applyPayload(payload) {
  if (!payload || !Array.isArray(payload.classes)) throw new Error('The response does not contain a valid "classes" array.');
  state.classes = payload.classes.map(normalizeClass);
  state.title = payload.title || "This Week's Classes";
  state.total = Number(payload.total_classes ?? state.classes.length);
  state.lastUpdated = new Date();
  render();
}
async function loadSchedule() {
  clearError(); $('refreshBtn').disabled = true; $('refreshBtn').innerHTML = '↻ <span>Loading…</span>';
  try {
    const response = await fetch(API_URL, { method:'GET', credentials:'include', headers:{'Accept':'application/json'}, cache:'no-store' });
    if (response.status === 401 || response.status === 403) throw new Error('Your tutor portal session may have expired. Sign in to the KidzTech portal, then refresh this app.');
    if (!response.ok) throw new Error(`Schedule request failed (${response.status}).`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('The endpoint did not return JSON. It may have redirected to the portal login page. Sign in to the tutor portal and try again.');
    applyPayload(await response.json());
  } catch (error) {
    const cors = error instanceof TypeError;
    showError(cors ? 'Could not reach the schedule API. If this app is hosted on a different domain, the portal must allow it through CORS. Alternatively, host this PWA on the portal origin or use the Import schedule JSON option.' : error.message);
    if (!state.classes.length) $('scheduleList').innerHTML = '<div class="empty"><strong>Schedule not loaded</strong><span>Refresh after signing in to the tutor portal, or import a saved JSON response.</span></div>';
  } finally { $('refreshBtn').disabled = false; $('refreshBtn').innerHTML = '↻ <span>Refresh</span>'; }
}
async function importJsonFile(file) {
  try { const data = JSON.parse(await file.text()); applyPayload(data); clearError(); showInfo('Schedule imported. Refresh to replace it with the live portal schedule.'); }
  catch (e) { showError(`Could not import schedule: ${e.message}`); }
}
function requestNotifications() {
  if (!('Notification' in window)) { showInfo('This browser does not support notifications.'); return; }
  Notification.requestPermission().then(permission => showInfo(permission === 'granted' ? 'Reminders are enabled while this app is open.' : 'Notifications were not enabled.'));
}
function checkReminders() {
  if (!state.reminders || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const c of state.classes) {
    if (!c.startAt || !validMeetLink(c.meetLink) || /held|cancel/i.test(c.status)) continue;
    const delta = c.startAt.getTime() - now;
    const key = `${c.id}-5`;
    if (delta > 0 && delta <= 5*60*1000 && !state.notified.has(key)) {
      new Notification(`Class in ${Math.max(1,Math.ceil(delta/60000))} minutes`, {body:`${c.student} · ${c.time}`, icon:'/icons/icon-192.png'});
      state.notified.add(key);
    }
  }
}
$('refreshBtn').addEventListener('click', loadSchedule);
$('dayFilter').addEventListener('change', render);
$('importBtn').addEventListener('click', () => $('jsonFile').click());
$('jsonFile').addEventListener('change', e => { if (e.target.files?.[0]) importJsonFile(e.target.files[0]); e.target.value=''; });
$('remindersToggle').addEventListener('change', e => { state.reminders = e.target.checked; if (state.reminders) requestNotifications(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('installBtn').hidden = false; });
$('installBtn').addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('installBtn').hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(console.warn));
loadSchedule();
setInterval(() => { render(); checkReminders(); }, 30000);
