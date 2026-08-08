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

document.querySelectorAll('#sidePanel a').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

document.querySelector('#themeButton').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('danube-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

if (localStorage.getItem('danube-theme') === 'dark') {
  document.body.classList.add('dark');
}

document.querySelector('#toTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  document.querySelector('#toTop').hidden = window.scrollY < 500;
}, { passive: true });

function makeAssetUrlsAbsolute(root) {
  root.querySelectorAll('[src]').forEach(element => {
    const source = element.getAttribute('src');
    if (!source || /^(data:|https?:\/\/|\/)/i.test(source)) return;
    element.setAttribute('src', new URL(source, new URL(SOURCE, document.baseURI)).href);
  });
}

async function loadJourney() {
  try {
    const response = await fetch(SOURCE, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load ${SOURCE}: HTTP ${response.status}`);

    const html = await response.text();
    const documentFromSource = new DOMParser().parseFromString(html, 'text/html');
    const sourceBody = documentFromSource.body;

    // index.html owns the app menu. Remove only the old HTML header/menu.
    sourceBody.querySelectorAll('header.topbar, script, style, link[rel="stylesheet"]').forEach(node => node.remove());
    makeAssetUrlsAbsolute(sourceBody);
    content.replaceChildren(...sourceBody.childNodes);
    status.textContent = '離線旅程 App · 內容已載入';
  } catch (error) {
    console.error(error);
    status.hidden = true;
    errorBox.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(error => console.error('Service Worker:', error));
  });
}

loadJourney();
