from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

card_start = text.index("    function createCard(loc) {")
card_end = text.index("\n    function getResultsZone", card_start)

new_card = r'''    function createCard(loc) {
      const grad = `linear-gradient(135deg, ${loc.colors[0]}44, ${loc.colors[1]}33, ${loc.colors[2]}22)`;
      const recentBadge = loc.createdAt && (Date.now() - new Date(loc.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000
        ? '<span class="text-xs bg-white/90 text-sage font-medium px-2.5 py-1 rounded-full border border-sand">Novo</span>'
        : '';
      const dogMeta = getDogStatusMeta(loc.dog_status || 'yes');
      const lastUpdate = getLastUpdateText(loc.id);
      const locationLine = getCardLocationLine(loc);
      const primaryFeature = getPrimaryFeatureBadge(loc);
      const trustBadge = getCardTrustBadge(loc);
      const photoUrl = loc.photo_url || '';

      return `
        <article class="card-hover bg-white rounded-2xl border border-sand shadow-sm overflow-hidden cursor-pointer" onclick="if (!event.target.closest('a')) showDetail(${loc.id})">
          <a href="/local/${encodeURIComponent(getPlaceSlug(loc))}" onclick="event.preventDefault(); showDetail(${loc.id})" class="block text-inherit no-underline" aria-label="Ver detalhes de ${loc.name}">
            <div class="h-44 relative flex items-center justify-center overflow-hidden" style="background:${grad}">
              ${photoUrl
                ? `<img src="${photoUrl}" alt="${loc.name}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                   <div class="absolute inset-0 bg-gradient-to-t from-bark/35 via-transparent to-bark/10"></div>`
                : `<span class="text-5xl">${loc.emoji}</span>`}
              <div class="absolute top-3 left-3">
                <span class="text-xs bg-white/90 text-bark/75 font-medium px-2.5 py-1 rounded-full border border-sand">${loc.displayType}</span>
              </div>
              <div class="absolute top-3 right-3 flex items-center gap-2 flex-wrap justify-end">
                ${recentBadge}
                <span class="${dogMeta.className} text-xs font-medium px-2.5 py-1 rounded-full">${dogMeta.short}</span>
              </div>
            </div>

            <div class="p-4">
              <div class="mb-3">
                <h3 class="font-display font-bold text-xl leading-tight">${loc.name}</h3>
                <p class="text-bark/55 text-sm flex items-center gap-1 mt-1">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                  ${locationLine}
                </p>
                ${getDistanceLabel(loc) ? `<p class="text-xs text-sage font-semibold mt-1">📍 ${getDistanceLabel(loc)} de ti</p>` : ''}
              </div>

              <div class="card-status-strip">
                <div class="flex flex-wrap gap-2">
                  <span class="card-feature-line ${primaryFeature.className}">${primaryFeature.text}</span>
                  <span class="card-trust-line ${trustBadge.className}">${trustBadge.text}</span>
                </div>
                ${lastUpdate ? `<p class="text-xs text-bark/50 mt-2">🕒 ${lastUpdate}</p>` : ''}
              </div>

              <div class="mt-4 flex items-center justify-end">
                <span class="text-sm text-sage font-semibold">Ver detalhes →</span>
              </div>
            </div>

            <div class="border-t border-sand bg-sand/35 px-3 py-2.5">
              <div class="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2">
                <span class="text-xs font-bold text-bark">Já estiveste aqui com o teu cão?</span>
                <i data-lucide="chevron-right" class="w-4 h-4 shrink-0 text-sage"></i>
              </div>
            </div>
          </a>
        </article>`;
    }
'''

text = text[:card_start] + new_card + text[card_end:]

show_start = text.index("    function showDetail(id, options = {}) {")
show_end = text.index("\n    async function confirmPlace", show_start)

new_show = r'''    function showDetail(id, options = {}) {
      const loc = locations.find((item) => item.id === id);
      if (!loc) return;

      const votes = getStoredPlaceVotes(loc.id);
      const confirmationCount = getConfirmationCount(loc.id);
      const lastUpdate = getLastUpdateText(loc.id);
      const grad = `linear-gradient(135deg, ${loc.colors[0]}55, ${loc.colors[1]}33)`;
      const mapsUrl = getGoogleMapsUrlForPlace(loc);
      const dogMeta = getDogStatusMeta(loc.dog_status || 'yes');
      const photoUrl = loc.photo_url || '';
      const directUrl = getPlaceDirectUrl(loc);
      const confirmationSummary = confirmationCount > 0
        ? `${confirmationCount} ${confirmationCount === 1 ? 'pessoa confirmou' : 'pessoas confirmaram'} esta informação${lastUpdate ? ` · ${lastUpdate}` : ''}`
        : 'Ainda sem confirmações da comunidade';

      if (!options.keepUrl) {
        const currentUrl = window.location.href;
        if (currentUrl !== directUrl) {
          window.history.pushState({ view: 'detail', id: loc.id }, '', directUrl);
        }
      }

      document.getElementById('detail-content').innerHTML = `
        <button type="button" onclick="showView('list')" class="text-sage font-medium text-sm flex items-center gap-1 mb-4">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> Voltar
        </button>
        <div class="rounded-2xl overflow-hidden border border-sand shadow-sm bg-white">
          <div class="h-56 flex items-center justify-center relative overflow-hidden" style="background:${grad}">
            ${photoUrl
              ? `<img src="${photoUrl}" alt="${loc.name}" class="absolute inset-0 w-full h-full object-cover" />
                 <div class="absolute inset-0 bg-gradient-to-t from-bark/35 via-transparent to-bark/10"></div>`
              : `<span class="text-6xl">${loc.emoji}</span>`}
            <span class="absolute top-4 right-4 ${dogMeta.className} text-sm font-medium px-3 py-1.5 rounded-full">${dogMeta.text}</span>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <h1 class="font-display text-2xl font-bold">${loc.name}</h1>
              <p class="text-bark/50 flex items-center gap-1 mt-1"><i data-lucide="map-pin" class="w-4 h-4"></i>${loc.city} · ${loc.displayType}</p>
              <p class="text-sm text-bark/55 mt-2">${loc.district ? `${loc.district}` : ''}${loc.municipality ? ` · ${loc.municipality}` : ''}${loc.locality ? ` · ${loc.locality}` : ''}</p>
            </div>

            <p class="text-bark/80 leading-relaxed">${loc.desc}</p>

            <div class="bg-sand/60 rounded-xl p-4 space-y-2">
              <p class="font-medium text-sm flex items-center gap-2"><i data-lucide="navigation" class="w-4 h-4 text-sage"></i> Morada</p>
              <p class="text-sm text-bark/70">${loc.address}</p>
              ${loc.website ? `<a href="${loc.website}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-sm text-sage font-medium hover:underline mt-2"><i data-lucide="external-link" class="w-4 h-4"></i> Ver website</a>` : ''}
            </div>

            ${loc.notes ? `
              <div class="bg-white border border-sand rounded-xl p-4 space-y-2">
                <p class="font-medium text-sm text-bark">Notas úteis</p>
                <p class="text-sm text-bark/70 leading-relaxed">${loc.notes}</p>
              </div>` : ''}

            ${Array.isArray(loc.features) && loc.features.length ? `
              <div class="bg-white border border-sand rounded-xl p-4 space-y-3">
                <p class="font-medium text-sm text-bark">Condições úteis</p>
                <div class="flex flex-wrap gap-2">
                  ${loc.features.map((feature) => `<span class="text-xs bg-sage/10 text-sage font-medium px-3 py-1.5 rounded-full">${feature}</span>`).join('')}
                </div>
              </div>` : ''}

            <div class="rounded-2xl border border-sand bg-sand/45 p-4 sm:p-5">
              <p class="text-xs font-bold uppercase tracking-wider text-sage">Ajuda a manter atualizado</p>
              <h2 class="font-display text-xl font-bold mt-2">Esta informação continua correta?</h2>
              <p class="text-sm text-bark/60 mt-2">Confirma apenas se estiveste recentemente neste local com o teu cão.</p>
              <div class="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs text-bark/60">${confirmationSummary}</div>
              <button type="button" onclick="openConfirmationModal(${loc.id})" class="mt-4 inline-flex items-center justify-center gap-2 w-full bg-sage text-cream font-semibold py-3 rounded-full shadow-sm hover:bg-moss transition active:scale-95">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                Confirmar informação
              </button>
            </div>

            <div class="grid sm:grid-cols-2 gap-3">
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full bg-sage text-cream font-semibold py-4 rounded-full shadow-md hover:bg-moss transition active:scale-95 text-lg">
                <i data-lucide="map" class="w-5 h-5"></i> Abrir no Google Maps
              </a>
              <button type="button" onclick="copyPlaceDirectLink(${loc.id})" class="flex items-center justify-center gap-2 w-full bg-white text-sage font-semibold py-4 rounded-full shadow-md border border-sage hover:bg-sand transition active:scale-95 text-lg">
                <i data-lucide="link" class="w-5 h-5"></i> Copiar link
              </button>
            </div>
          </div>
        </div>

        <div id="confirmation-modal" class="hidden fixed inset-0 z-[110] bg-bark/55 backdrop-blur-sm p-0 sm:p-4" onclick="if (event.target === this) closeConfirmationModal()">
          <div class="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl sm:relative sm:inset-auto sm:mx-auto sm:mt-[8vh] sm:max-w-lg sm:rounded-3xl sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-sage">Confirmação da comunidade</p>
                <h2 class="font-display text-2xl font-bold mt-2">Estiveste aqui recentemente com o teu cão?</h2>
                <p class="text-sm text-bark/55 mt-1">${loc.name}</p>
              </div>
              <button type="button" onclick="closeConfirmationModal()" class="shrink-0 w-10 h-10 rounded-full border border-sand bg-white inline-flex items-center justify-center" aria-label="Fechar">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <p class="text-sm text-bark/60 leading-relaxed mt-4">Não estamos a pedir uma avaliação. Queremos apenas saber se as condições publicadas continuam corretas.</p>

            <div class="mt-5 space-y-3">
              <button id="confirmation-choice-correct" type="button" onclick="selectConfirmationChoice('correct')" class="w-full text-left rounded-2xl border-2 border-sand bg-white p-4 transition">
                <span class="font-semibold text-sm">✅ Sim, a informação está correta</span>
                <span class="block text-xs text-bark/50 mt-1">As condições correspondem ao que encontrei.</span>
              </button>

              <button id="confirmation-choice-different" type="button" onclick="selectConfirmationChoice('different')" class="w-full text-left rounded-2xl border-2 border-sand bg-white p-4 transition">
                <span class="font-semibold text-sm">⚠️ Não, encontrei informação diferente</span>
                <span class="block text-xs text-bark/50 mt-1">Indica o que mudou para podermos verificar.</span>
              </button>

              <textarea id="confirmation-difference-text" rows="4" maxlength="500" oninput="updateConfirmationSubmitState()" class="hidden w-full resize-none rounded-2xl border border-sand bg-white px-4 py-3 text-sm outline-none focus:border-sage" placeholder="Ex.: agora só aceitam cães na esplanada..."></textarea>

              <button id="confirmation-submit" type="button" onclick="submitConfirmationPreview()" disabled class="w-full rounded-full bg-sage py-3.5 text-sm font-semibold text-cream opacity-40 transition">Enviar confirmação</button>
              <p class="text-center text-xs text-bark/40">Demonstração visual: nesta branch nenhuma resposta é guardada.</p>
            </div>

            <div id="confirmation-thanks" class="hidden py-7 text-center">
              <div class="mx-auto w-16 h-16 rounded-full bg-sand text-sage flex items-center justify-center">
                <i data-lucide="heart-handshake" class="w-8 h-8"></i>
              </div>
              <h3 class="font-display text-2xl font-bold mt-4">Obrigado por ajudares.</h3>
              <p class="text-sm text-bark/60 mt-2">A tua confirmação ajuda outras pessoas a saberem onde podem ir com o cão.</p>
              <button type="button" onclick="closeConfirmationModal()" class="mt-5 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-cream">Concluir</button>
            </div>
          </div>
        </div>
      `;

      hideSuggestions();
      showView('detail');
      lucide.createIcons();
    }

    let confirmationPreviewChoice = '';

    function openConfirmationModal() {
      confirmationPreviewChoice = '';
      const modal = document.getElementById('confirmation-modal');
      const choices = modal?.querySelector('.space-y-3');
      const thanks = document.getElementById('confirmation-thanks');
      const textarea = document.getElementById('confirmation-difference-text');

      if (!modal) return;
      modal.classList.remove('hidden');
      if (choices) choices.classList.remove('hidden');
      if (thanks) thanks.classList.add('hidden');
      if (textarea) {
        textarea.value = '';
        textarea.classList.add('hidden');
      }
      document.body.style.overflow = 'hidden';
      updateConfirmationChoiceStyles();
      updateConfirmationSubmitState();
      lucide.createIcons();
    }

    function closeConfirmationModal() {
      const modal = document.getElementById('confirmation-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function selectConfirmationChoice(choice) {
      confirmationPreviewChoice = choice;
      const textarea = document.getElementById('confirmation-difference-text');
      if (textarea) {
        textarea.classList.toggle('hidden', choice !== 'different');
        if (choice === 'different') setTimeout(() => textarea.focus(), 50);
      }
      updateConfirmationChoiceStyles();
      updateConfirmationSubmitState();
    }

    function updateConfirmationChoiceStyles() {
      ['correct', 'different'].forEach((choice) => {
        const button = document.getElementById(`confirmation-choice-${choice}`);
        if (!button) return;
        const selected = confirmationPreviewChoice === choice;
        button.classList.toggle('border-sage', selected);
        button.classList.toggle('bg-sand/50', selected);
        button.classList.toggle('border-sand', !selected);
        button.classList.toggle('bg-white', !selected);
      });
    }

    function updateConfirmationSubmitState() {
      const submit = document.getElementById('confirmation-submit');
      const details = document.getElementById('confirmation-difference-text')?.value.trim() || '';
      const valid = confirmationPreviewChoice === 'correct' || (confirmationPreviewChoice === 'different' && details.length > 0);
      if (!submit) return;
      submit.disabled = !valid;
      submit.classList.toggle('opacity-40', !valid);
      submit.classList.toggle('opacity-100', valid);
    }

    function submitConfirmationPreview() {
      const choices = document.getElementById('confirmation-submit')?.closest('.space-y-3');
      const thanks = document.getElementById('confirmation-thanks');
      if (choices) choices.classList.add('hidden');
      if (thanks) thanks.classList.remove('hidden');
      lucide.createIcons();
    }
'''

text = text[:show_start] + new_show + text[show_end:]

path.write_text(text, encoding="utf-8")

assert "Já estiveste aqui com o teu cão?" in text
assert "Demonstração visual: nesta branch nenhuma resposta é guardada." in text
assert "text-bark/72 text-sm line-clamp-2" not in text
print("index.html atualizado com confirmações integradas")
