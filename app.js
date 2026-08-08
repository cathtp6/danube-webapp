const SOURCE = 'danube_grand_journey.html';
const content = document.querySelector('#content');
const status = document.querySelector('#status');
const errorBox = document.querySelector('#error');
const toc = document.querySelector('#toc');
const panel = document.querySelector('#sidePanel');
const backdrop = document.querySelector('#backdrop');
const menuButton = document.querySelector('#menuButton');
const installButton = document.querySelector('#installButton');
let deferredPrompt;

function openMenu(open = true) {
  panel.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
}
menuButton.addEventListener('click', () => openMenu(!panel.classList.contains('open')));
document.querySelector('#closeButton').addEventListener('click', () => openMenu(false));
backdrop.addEventListener('click', () => openMenu(false));

document.querySelector('#themeButton').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('danube-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('danube-theme') === 'dark') document.body.classList.add('dark');

document.querySelector('#toTop').addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
window.addEventListener('scroll', () => { document.querySelector('#toTop').hidden = window.scrollY < 500; }, {passive:true});

function buildToc() {
  const headings = [...content.querySelectorAll('h1,h2,h3')];
  toc.replaceChildren();
  if (!headings.length) { toc.innerHTML = '<p class="muted">沒有可用目錄</p>'; return; }
  headings.forEach((heading, i) => {
    if (!heading.id) heading.id = `section-${i + 1}`;
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.className = `level-${heading.tagName.slice(1)}`;
    link.addEventListener('click', () => openMenu(false));
    toc.appendChild(link);
  });
}

function absolutizeAssetUrls(root, base) {
  root.querySelectorAll('[src],[href]').forEach(el => {
    ['src','href'].forEach(attr => {
      const value = el.getAttribute(attr);
      if (!value || value.startsWith('#') || value.startsWith('data:') || value.startsWith('http')) return;
      try { el.setAttribute(attr, new URL(value, base).href); } catch (_) {}
    });
  });
}

async function loadSource() {
  try {
    const response = await fetch(SOURCE, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const sourceBody = parsed.body || parsed.documentElement;
    sourceBody.querySelectorAll('script,style,link[rel="stylesheet"]').forEach(node => node.remove());
    absolutizeAssetUrls(sourceBody, new URL(SOURCE, document.baseURI));
    content.replaceChildren(...sourceBody.childNodes);
    buildToc();
    status.textContent = '離線旅程 App · 內容已載入';
  } catch (err) {
    status.hidden = true;
    errorBox.hidden = false;
    console.error('Unable to load source HTML:', err);
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

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
loadSource();
