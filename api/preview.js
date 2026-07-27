const SITE_URL = 'https://levocao.pt';

const PREVIEW_STYLES = `
<style id="confirmation-preview-styles">
  .confirmation-card-prompt {
    border-top: 1px solid #F5F0E8;
    background: rgba(245, 240, 232, 0.48);
    padding: 0.75rem 1rem;
  }
  .confirmation-card-prompt-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.7rem 0.8rem;
    border-radius: 0.9rem;
    background: #FFFDF7;
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .card-hover:hover .confirmation-card-prompt-inner {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(61, 44, 30, .07);
  }
  .confirmation-card-prompt-title {
    display: block;
    color: #3D2C1E;
    font-size: .82rem;
    line-height: 1.2;
    font-weight: 700;
  }
  .confirmation-card-prompt-help {
    display: block;
    color: rgba(61, 44, 30, .52);
    font-size: .7rem;
    line-height: 1.2;
    margin-top: .2rem;
  }
  .confirmation-preview-panel {
    border: 1px solid #F5F0E8;
    background: rgba(245, 240, 232, .52);
    border-radius: 1rem;
    padding: 1rem;
  }
  .confirmation-preview-kicker {
    color: #5B7553;
    font-size: .72rem;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .confirmation-preview-title {
    color: #3D2C1E;
    font-family: Fraunces, Georgia, serif;
    font-size: 1.28rem;
    font-weight: 700;
    line-height: 1.25;
    margin-top: .45rem;
  }
  .confirmation-preview-description {
    color: rgba(61, 44, 30, .65);
    font-size: .88rem;
    line-height: 1.55;
    margin-top: .45rem;
  }
  .confirmation-preview-summary {
    background: #fff;
    border-radius: .8rem;
    color: rgba(61, 44, 30, .62);
    font-size: .76rem;
    line-height: 1.45;
    margin-top: .8rem;
    padding: .7rem .8rem;
  }
  .confirmation-preview-button {
    align-items: center;
    background: #5B7553;
    border: 0;
    border-radius: 9999px;
    color: #FFFDF7;
    cursor: pointer;
    display: inline-flex;
    font-size: .9rem;
    font-weight: 700;
    gap: .5rem;
    justify-content: center;
    margin-top: .9rem;
    padding: .82rem 1rem;
    transition: background .18s ease, transform .18s ease;
    width: 100%;
  }
  .confirmation-preview-button:hover { background: #8BA67A; }
  .confirmation-preview-button:active { transform: scale(.98); }
  .confirmation-preview-footnote {
    color: rgba(61, 44, 30, .43);
    font-size: .69rem;
    line-height: 1.4;
    margin-top: .55rem;
    text-align: center;
  }
  .confirmation-preview-modal {
    align-items: flex-end;
    background: rgba(61, 44, 30, .5);
    backdrop-filter: blur(6px);
    display: none;
    inset: 0;
    justify-content: center;
    padding: 0;
    position: fixed;
    z-index: 99999;
  }
  .confirmation-preview-modal.is-open { display: flex; }
  .confirmation-preview-dialog {
    background: #FFFDF7;
    border-radius: 1.5rem 1.5rem 0 0;
    box-shadow: 0 -18px 50px rgba(61, 44, 30, .2);
    max-height: 92vh;
    overflow-y: auto;
    padding: 1.25rem;
    width: 100%;
  }
  .confirmation-preview-choice {
    align-items: flex-start;
    background: #fff;
    border: 2px solid #F5F0E8;
    border-radius: 1rem;
    color: #3D2C1E;
    cursor: pointer;
    display: flex;
    gap: .8rem;
    margin-top: .7rem;
    padding: .9rem;
    text-align: left;
    transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    width: 100%;
  }
  .confirmation-preview-choice.is-selected {
    background: rgba(245, 240, 232, .58);
    border-color: #5B7553;
    box-shadow: 0 0 0 3px rgba(91, 117, 83, .12);
  }
  .confirmation-preview-textarea {
    background: #fff;
    border: 1px solid #F5F0E8;
    border-radius: .9rem;
    color: #3D2C1E;
    display: none;
    font: inherit;
    margin-top: .8rem;
    min-height: 7rem;
    outline: none;
    padding: .8rem;
    resize: vertical;
    width: 100%;
  }
  .confirmation-preview-textarea.is-visible { display: block; }
  .confirmation-preview-demo-note {
    background: rgba(245, 240, 232, .65);
    border-radius: .8rem;
    color: rgba(61, 44, 30, .58);
    font-size: .72rem;
    line-height: 1.45;
    margin-top: .9rem;
    padding: .7rem .8rem;
    text-align: center;
  }
  @media (min-width: 640px) {
    .confirmation-preview-modal { align-items: center; padding: 1rem; }
    .confirmation-preview-dialog { border-radius: 1.5rem; max-width: 31rem; padding: 1.5rem; }
  }
</style>`;

const PREVIEW_SCRIPT = String.raw`
<script id="confirmation-preview-script">
(() => {
  let selectedChoice = '';
  let activePlaceId = null;

  function refreshIcons() {
    try { if (window.lucide) window.lucide.createIcons(); } catch (_) {}
  }

  function ensureModal() {
    if (document.getElementById('confirmation-preview-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="confirmation-preview-modal" class="confirmation-preview-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-preview-modal-title">
        <div class="confirmation-preview-dialog">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;">
            <div>
              <p class="confirmation-preview-kicker">Confirmação da comunidade</p>
              <h2 id="confirmation-preview-modal-title" class="confirmation-preview-title" style="font-size:1.45rem;">Estiveste aqui recentemente com o teu cão?</h2>
              <p id="confirmation-preview-place-name" class="confirmation-preview-description"></p>
            </div>
            <button type="button" data-confirmation-close aria-label="Fechar" style="width:2.5rem;height:2.5rem;display:flex;align-items:center;justify-content:center;border:1px solid #F5F0E8;border-radius:9999px;background:#fff;color:#3D2C1E;cursor:pointer;flex:none;">
              <i data-lucide="x" style="width:1.1rem;height:1.1rem;"></i>
            </button>
          </div>
          <p class="confirmation-preview-description">Não estamos a pedir uma avaliação. Queremos apenas saber se as condições publicadas continuam corretas.</p>

          <button type="button" class="confirmation-preview-choice" data-confirmation-choice="correct">
            <span style="width:2.5rem;height:2.5rem;display:flex;align-items:center;justify-content:center;border-radius:.75rem;background:#F5F0E8;color:#5B7553;flex:none;"><i data-lucide="check" style="width:1.1rem;height:1.1rem;"></i></span>
            <span><strong style="display:block;font-size:.88rem;">Sim, a informação está correta</strong><span style="display:block;margin-top:.25rem;font-size:.75rem;line-height:1.4;color:rgba(61,44,30,.55);">As condições correspondem ao que encontrei.</span></span>
          </button>

          <button type="button" class="confirmation-preview-choice" data-confirmation-choice="different">
            <span style="width:2.5rem;height:2.5rem;display:flex;align-items:center;justify-content:center;border-radius:.75rem;background:#F5F0E8;color:#5B7553;flex:none;"><i data-lucide="message-square-warning" style="width:1.1rem;height:1.1rem;"></i></span>
            <span><strong style="display:block;font-size:.88rem;">Não, encontrei informação diferente</strong><span style="display:block;margin-top:.25rem;font-size:.75rem;line-height:1.4;color:rgba(61,44,30,.55);">Indica o que mudou para podermos verificar.</span></span>
          </button>

          <textarea id="confirmation-preview-details" class="confirmation-preview-textarea" maxlength="500" placeholder="Ex.: agora só aceitam cães na esplanada..."></textarea>

          <button id="confirmation-preview-submit" type="button" class="confirmation-preview-button" disabled style="opacity:.45;">Enviar confirmação</button>
          <p class="confirmation-preview-demo-note">Demonstração visual: nenhuma confirmação é guardada no Supabase.</p>
        </div>
      </div>
    `);
    refreshIcons();
  }

  function enhanceCards() {
    ['cards-recent', 'cards-top', 'cards-list', 'cards-region'].forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('article.card-hover').forEach((card) => {
        if (card.querySelector('.confirmation-card-prompt')) return;
        const link = card.querySelector(':scope > a') || card.querySelector('a');
        if (!link) return;
        link.insertAdjacentHTML('beforeend', `
          <div class="confirmation-card-prompt">
            <div class="confirmation-card-prompt-inner">
              <span>
                <span class="confirmation-card-prompt-title">Já estiveste aqui com o teu cão?</span>
                <span class="confirmation-card-prompt-help">Vê as condições antes de confirmar</span>
              </span>
              <i data-lucide="chevron-right" style="width:1rem;height:1rem;color:#5B7553;flex:none;"></i>
            </div>
          </div>
        `);
      });
    });
    refreshIcons();
  }

  function extractPlaceId(button) {
    const raw = button?.getAttribute('onclick') || '';
    const match = raw.match(/confirmPlace\((\d+)/);
    return match ? Number(match[1]) : (window.history.state?.id || null);
  }

  function enhanceDetail() {
    const detail = document.getElementById('detail-content');
    if (!detail || !detail.children.length || detail.querySelector('.confirmation-preview-panel')) return;

    const confirmationHeading = [...detail.querySelectorAll('p')].find((el) => el.textContent.trim() === 'Confirmações');
    if (!confirmationHeading) return;
    const oldPanel = confirmationHeading.closest('div.bg-white.border');
    if (!oldPanel) return;

    const oldSummary = oldPanel.querySelector('p.text-sm')?.textContent?.trim() || 'Ainda sem confirmações recentes.';
    const oldButtons = [...detail.querySelectorAll('button')].filter((button) => (button.getAttribute('onclick') || '').includes('confirmPlace('));
    const placeId = extractPlaceId(oldButtons[0]);
    const oldButtonGrid = oldButtons[0]?.closest('.grid');

    oldPanel.className = 'confirmation-preview-panel';
    oldPanel.innerHTML = `
      <p class="confirmation-preview-kicker">Ajuda a manter atualizado</p>
      <h3 class="confirmation-preview-title">Esta informação continua correta?</h3>
      <p class="confirmation-preview-description">Confirma apenas se estiveste recentemente neste local com o teu cão.</p>
      <div class="confirmation-preview-summary">${oldSummary}</div>
      <button type="button" class="confirmation-preview-button" data-open-confirmation="${placeId || ''}">
        <i data-lucide="check-circle-2" style="width:1.05rem;height:1.05rem;"></i>
        Confirmar informação
      </button>
      <p class="confirmation-preview-footnote">A confirmação é feita aqui, depois de veres as condições do local.</p>
    `;

    if (oldButtonGrid) oldButtonGrid.remove();
    refreshIcons();
  }

  function openModal(placeId) {
    ensureModal();
    activePlaceId = placeId || window.history.state?.id || null;
    selectedChoice = '';
    const modal = document.getElementById('confirmation-preview-modal');
    const placeName = document.querySelector('#detail-content h1')?.textContent?.trim() || '';
    document.getElementById('confirmation-preview-place-name').textContent = placeName;
    document.querySelectorAll('[data-confirmation-choice]').forEach((el) => el.classList.remove('is-selected'));
    const textarea = document.getElementById('confirmation-preview-details');
    textarea.value = '';
    textarea.classList.remove('is-visible');
    const submit = document.getElementById('confirmation-preview-submit');
    submit.disabled = true;
    submit.style.opacity = '.45';
    submit.textContent = 'Enviar confirmação';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('confirmation-preview-modal')?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function choose(value, button) {
    selectedChoice = value;
    document.querySelectorAll('[data-confirmation-choice]').forEach((el) => el.classList.toggle('is-selected', el === button));
    document.getElementById('confirmation-preview-details')?.classList.toggle('is-visible', value === 'different');
    const submit = document.getElementById('confirmation-preview-submit');
    submit.disabled = false;
    submit.style.opacity = '1';
    if (value === 'different') setTimeout(() => document.getElementById('confirmation-preview-details')?.focus(), 50);
  }

  function submitDemo() {
    if (!selectedChoice) return;
    const dialog = document.querySelector('.confirmation-preview-dialog');
    dialog.innerHTML = `
      <div style="text-align:center;padding:1.5rem .5rem;">
        <div style="width:4rem;height:4rem;margin:0 auto;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#F5F0E8;color:#5B7553;"><i data-lucide="heart-handshake" style="width:2rem;height:2rem;"></i></div>
        <h2 class="confirmation-preview-title" style="font-size:1.55rem;margin-top:1rem;">Obrigado por ajudares.</h2>
        <p class="confirmation-preview-description">Na versão final, esta resposta ficará associada ao local e ajudará outras pessoas a saberem onde podem ir com o cão.</p>
        <p class="confirmation-preview-demo-note">Nesta demonstração, a resposta não foi guardada.</p>
        <button type="button" class="confirmation-preview-button" data-confirmation-close>Concluir</button>
      </div>
    `;
    refreshIcons();
  }

  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-confirmation]');
    if (open) {
      event.preventDefault();
      openModal(Number(open.dataset.openConfirmation) || null);
      return;
    }
    const choice = event.target.closest('[data-confirmation-choice]');
    if (choice) {
      choose(choice.dataset.confirmationChoice, choice);
      return;
    }
    if (event.target.closest('[data-confirmation-close]')) {
      closeModal();
      return;
    }
    if (event.target.id === 'confirmation-preview-modal') closeModal();
    if (event.target.id === 'confirmation-preview-submit') submitDemo();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  // Impede qualquer gravação acidental nesta preview.
  const previewConfirmPlace = (id) => openModal(id);
  try { window.confirmPlace = previewConfirmPlace; } catch (_) {}
  try { confirmPlace = previewConfirmPlace; } catch (_) {}

  const observer = new MutationObserver(() => {
    enhanceCards();
    enhanceDetail();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  ensureModal();
  enhanceCards();
  enhanceDetail();
  setTimeout(() => { enhanceCards(); enhanceDetail(); }, 800);
  setTimeout(() => { enhanceCards(); enhanceDetail(); }, 1800);
})();
</script>`;

function sanitizePath(value) {
  const path = String(value || '/');
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

module.exports = async function handler(req, res) {
  try {
    const path = sanitizePath(req.query.path || '/');
    const upstream = await fetch(`${SITE_URL}${path}`, {
      headers: { 'user-agent': 'levocao-confirmation-preview/1.0' }
    });

    if (!upstream.ok) {
      res.status(upstream.status).send('Não foi possível carregar a versão atual do site.');
      return;
    }

    let html = await upstream.text();
    html = html.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow" />');
    if (!/<meta\s+name="robots"/i.test(html)) {
      html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>');
    }
    html = html.replace('</head>', `${PREVIEW_STYLES}\n</head>`);
    html = html.replace('</body>', `${PREVIEW_SCRIPT}\n</body>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(html);
  } catch (error) {
    console.error('Preview render failed:', error);
    res.status(500).send('Não foi possível criar a pré-visualização.');
  }
};
