const SOURCE = 'danube_grand_journey.html';
const content = document.querySelector('#content');
const status = document.querySelector('#status');
const errorBox = document.querySelector('#error');
const panel = document.querySelector('#sidePanel');
const backdrop = document.querySelector('#backdrop');
const menuButton = document.querySelector('#menuButton');
const installButton = document.querySelector('#installButton');
let deferredPrompt;

function setMenu(open) {
  panel.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
}
menuButton.addEventListener('click', () => setMenu(!panel.classList.contains('open')));
document.querySelector('#closeButton').addEventListener('click', () => setMenu(false));
backdrop.addEventListener('click', () => setMenu(false));
document.querySelectorAll('#sidePanel a').forEach(link => link.addEventListener('click', () => setMenu(false)));

document.querySelector('#themeButton').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('danube-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('danube-theme') === 'dark') document.body.classList.add('dark');

document.querySelector('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => { document.querySelector('#toTop').hidden = window.scrollY < 500; }, { passive: true });

function setLanguage(language) {
  document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  content.querySelectorAll('[data-zh]').forEach(node => node.classList.toggle('hidden', language !== 'zh'));
  content.querySelectorAll('[data-en]').forEach(node => node.classList.toggle('hidden', language !== 'en'));
  document.querySelector('#zhButton').classList.toggle('active', language === 'zh');
  document.querySelector('#enButton').classList.toggle('active', language === 'en');
  localStorage.setItem('tripLang', language);
}

document.querySelector('#zhButton').addEventListener('click', () => setLanguage('zh'));
document.querySelector('#enButton').addEventListener('click', () => setLanguage('en'));

function makeAssetUrlsAbsolute(root) {
  root.querySelectorAll('[src]').forEach(element => {
    const source = element.getAttribute('src');
    if (!source || /^(data:|https?:\/\/|\/)/i.test(source)) return;
    element.setAttribute('src', new URL(source, new URL(SOURCE, document.baseURI)).href);
  });
}

function restoreOriginalDesign(sourceDocument) {
  sourceDocument.head.querySelectorAll('style').forEach(sourceStyle => {
    const style = document.createElement('style');
    style.dataset.originalDesign = 'true';
    style.textContent = sourceStyle.textContent;
    document.head.appendChild(style);
  });
  // Re-apply the Web App stylesheet after the original design rules.
  const appStyles = document.createElement('link');
  appStyles.rel = 'stylesheet';
  appStyles.href = 'styles.css';
  document.head.appendChild(appStyles);
}

async function loadJourney() {
  try {
    const response = await fetch(SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load ${SOURCE}: HTTP ${response.status}`);
    const html = await response.text();
    const sourceDocument = new DOMParser().parseFromString(html, 'text/html');
    const sourceBody = sourceDocument.body;

    // Keep the original inline CSS; remove only the old header and its language script.
    sourceBody.querySelectorAll('header.topbar, script').forEach(node => node.remove());
    makeAssetUrlsAbsolute(sourceBody);
    restoreOriginalDesign(sourceDocument);
    content.replaceChildren(...sourceBody.childNodes);
    setLanguage(localStorage.getItem('tripLang') || 'zh');
    status.textContent = '離線旅程 App · 內容已載入';
  } catch (error) {
    console.error(error);
    status.hidden = true;
    errorBox.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredPrompt = event; installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; installButton.hidden = true;
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(console.error));
loadJourney();
