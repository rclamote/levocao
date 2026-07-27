(() => {
  let selectedChoice = '';
  let enhancementTimer = null;

  function refreshIcons() {
    try {
      if (window.lucide) window.lucide.createIcons();
    } catch (_) {}
  }

  function ensureModal() {
    if (document.getElementById('confirmation-preview-modal')) return false;

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

    return true;
  }

  function enhanceCards() {
    let changed = false;

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
        changed = true;
      });
    });

    return changed;
  }

  function extractPlaceId(button) {
    const raw = button?.getAttribute('onclick') || '';
    const match = raw.match(/confirmPlace\((\d+)/);
    return match ? Number(match[1]) : (window.history.state?.id || null);
  }

  function enhanceDetail() {
    const detail = document.getElementById('detail-content');
    if (!detail || !detail.children.length || detail.querySelector('.confirmation-preview-panel')) return false;

    const confirmationHeading = [...detail.querySelectorAll('p')]
      .find((element) => element.textContent.trim() === 'Confirmações');

    if (!confirmationHeading) return false;

    const oldPanel = confirmationHeading.closest('div.bg-white.border');
    if (!oldPanel) return false;

    const oldSummary = oldPanel.querySelector('p.text-sm')?.textContent?.trim()
      || 'Ainda sem confirmações recentes.';

    const oldButtons = [...detail.querySelectorAll('button')]
      .filter((button) => (button.getAttribute('onclick') || '').includes('confirmPlace('));

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
    return true;
  }

  function runEnhancements() {
    const modalAdded = ensureModal();
    const cardsChanged = enhanceCards();
    const detailChanged = enhanceDetail();

    if (modalAdded || cardsChanged || detailChanged) refreshIcons();
  }

  function scheduleEnhancements() {
    window.clearTimeout(enhancementTimer);
    enhancementTimer = window.setTimeout(runEnhancements, 60);
  }

  function resetModal() {
    document.getElementById('confirmation-preview-modal')?.remove();
    ensureModal();
    refreshIcons();
  }

  function openModal(placeId) {
    if (ensureModal()) refreshIcons();

    selectedChoice = '';
    const modal = document.getElementById('confirmation-preview-modal');
    const placeName = document.querySelector('#detail-content h1')?.textContent?.trim() || '';

    document.getElementById('confirmation-preview-place-name').textContent = placeName;
    document.querySelectorAll('[data-confirmation-choice]').forEach((element) => {
      element.classList.remove('is-selected');
    });

    const textarea = document.getElementById('confirmation-preview-details');
    textarea.value = '';
    textarea.classList.remove('is-visible');

    const submit = document.getElementById('confirmation-preview-submit');
    submit.disabled = true;
    submit.style.opacity = '.45';
    submit.textContent = 'Enviar confirmação';
    submit.dataset.placeId = placeId || '';

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('confirmation-preview-modal')?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function choose(value, button) {
    selectedChoice = value;

    document.querySelectorAll('[data-confirmation-choice]').forEach((element) => {
      element.classList.toggle('is-selected', element === button);
    });

    document.getElementById('confirmation-preview-details')
      ?.classList.toggle('is-visible', value === 'different');

    const submit = document.getElementById('confirmation-preview-submit');
    submit.disabled = false;
    submit.style.opacity = '1';

    if (value === 'different') {
      window.setTimeout(() => document.getElementById('confirmation-preview-details')?.focus(), 50);
    }
  }

  function submitDemo() {
    if (!selectedChoice) return;

    const dialog = document.querySelector('.confirmation-preview-dialog');
    if (!dialog) return;

    dialog.innerHTML = `
      <div style="text-align:center;padding:1.5rem .5rem;">
        <div style="width:4rem;height:4rem;margin:0 auto;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#F5F0E8;color:#5B7553;"><i data-lucide="heart-handshake" style="width:2rem;height:2rem;"></i></div>
        <h2 class="confirmation-preview-title" style="font-size:1.55rem;margin-top:1rem;">Obrigado por ajudares.</h2>
        <p class="confirmation-preview-description">Na versão final, esta resposta ficará associada ao local e ajudará outras pessoas a saberem onde podem ir com o cão.</p>
        <p class="confirmation-preview-demo-note">Nesta demonstração, a resposta não foi guardada.</p>
        <button type="button" class="confirmation-preview-button" data-confirmation-finish>Concluir</button>
      </div>
    `;

    refreshIcons();
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-confirmation]');
    if (openButton) {
      event.preventDefault();
      openModal(Number(openButton.dataset.openConfirmation) || null);
      return;
    }

    const choiceButton = event.target.closest('[data-confirmation-choice]');
    if (choiceButton) {
      choose(choiceButton.dataset.confirmationChoice, choiceButton);
      return;
    }

    if (event.target.closest('[data-confirmation-close]')) {
      closeModal();
      return;
    }

    if (event.target.closest('[data-confirmation-finish]')) {
      closeModal();
      resetModal();
      return;
    }

    if (event.target.id === 'confirmation-preview-modal') {
      closeModal();
      return;
    }

    if (event.target.id === 'confirmation-preview-submit') {
      submitDemo();
      return;
    }

    scheduleEnhancements();
    window.setTimeout(runEnhancements, 250);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  const previewConfirmPlace = (id) => openModal(id);
  try { window.confirmPlace = previewConfirmPlace; } catch (_) {}

  runEnhancements();
  window.setTimeout(runEnhancements, 500);
  window.setTimeout(runEnhancements, 1500);
  window.setTimeout(runEnhancements, 3000);
})();
