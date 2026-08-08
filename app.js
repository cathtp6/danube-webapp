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

function visibleText(node) {
  const zh = node.querySelector('[data-zh]');
  return (zh ? zh.textContent : node.textContent).replace(/\s+/g, ' ').trim();
}

function addMenuLink(label, target, level = '') {
  if (!target || target === '#') return;
  const link = document.createElement('a');
  link.href = target.startsWith('#') ? target : `#${target}`;
  link.textContent = label;
  link.className = level;
  link.addEventListener('click', () => openMenu(false));
  toc.appendChild(link);
}

function buildOriginalMenu(originalNav, originalJump) {
  toc.replaceChildren();
  const title = document.createElement('div');
  title.className = 'menu-group-title';
  title.textContent = '旅程章節';
  toc.appendChild(title);
  originalNav?.querySelectorAll('a[href]').forEach(anchor => {
    addMenuLink(visibleText(anchor), anchor.getAttribute('href'));
  });

  const options = [...(originalJump?.querySelectorAll('option') || [])]
    .filter(option => option.value && !/^Jump/i.test(option.textContent.trim()));
  if (options.length) {
    const dateTitle = document.createElement('div');
    dateTitle.className = 'menu-group-title';
    dateTitle.textContent = '每日行程';
    toc.appendChild(dateTitle);
    options.forEach(option => addMenuLink(option.textContent.trim(), option.value, 'level-3'));
  }

  if (!toc.querySelector('a')) {
    const headings = [...content.querySelectorAll('h1,h2,h3')];
    headings.forEach((heading, i) => {
      if (!heading.id) heading.id = `section-${i + 1}`;
      addMenuLink(heading.textContent.trim(), `#${heading.id}`, `level-${heading.tagName.slice(1)}`);
    });
  }
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
    const originalNav = sourceBody.querySelector('nav.nav');
    const originalJump = sourceBody.querySelector('select.jump');

    // Remove the original fixed header/menu so only the new mobile menu remains.
    sourceBody.querySelectorAll('header.topbar, nav.nav, select.jump, .lang, script, style, link[rel="stylesheet"]').forEach(node => node.remove());
    absolutizeAssetUrls(sourceBody, new URL(SOURCE, document.baseURI));
    content.replaceChildren(...sourceBody.childNodes);
    buildOriginalMenu(originalNav, originalJump);
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
