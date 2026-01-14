document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('menu-semanal');
  // Se a página não tiver o container de listagem, aborta (ex: admin.html)
  if (!container) return;

  fetch('data.json')
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      const title = document.querySelector('#lista-resultados h2');
          if (title) title.textContent = 'Menus Públicos';
      container.innerHTML = '';

          // Filtrar apenas menus públicos (public === true ou 'true')
          const publicEntries = Object.entries(data).filter(([k, m]) => m && (m.public === true || m.public === 'true'));
          if (publicEntries.length === 0) {
            container.innerHTML = '<p>Nenhum menu público disponível.</p>';
            return;
          }

          publicEntries.forEach(([key, menuObj]) => {
        const card = document.createElement('section');
        card.className = 'menu-card';

        const metaWrap = document.createElement('div');
        metaWrap.className = 'menu-meta';

        const h3 = document.createElement('h3');
        h3.textContent = menuObj.titulo || key;
        metaWrap.appendChild(h3);

        const meta = document.createElement('p');
        meta.textContent = `${menuObj['data-inicio'] || ''} → ${menuObj['data-fim'] || ''} ${menuObj.author || ''}`;
        metaWrap.appendChild(meta);

        card.appendChild(metaWrap);

        const diasObj = (menuObj.dias && menuObj.dias[0]) ? menuObj.dias[0] : {};

        const daysRow = document.createElement('div');
        daysRow.className = 'menu-days';

        const order = ['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
        order.forEach(d => {
          const info = diasObj[d] || {};
          const dayTile = document.createElement('div');
          dayTile.className = 'day-tile';
          dayTile.innerHTML = `<div class="day-name">${capitalize(d)}</div>` +
            `<div class="meal"><strong>Almoço:</strong> ${escapeHtml(info.almoco || '')}</div>` +
            `<div class="meal"><strong>Jantar:</strong> ${escapeHtml(info.jantar || '')}</div>`;
          daysRow.appendChild(dayTile);
        });

        card.appendChild(daysRow);

        container.appendChild(card);
      });
    })
    .catch(err => {
      const lista = document.getElementById('lista-resultados');
      if (lista) lista.textContent = 'Erro ao carregar menus.';
      console.error(err);
    });

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
