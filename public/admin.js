window.onload = function () {
  // Lista de dias para gerar o HTML automaticamente
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  let menusList = [];

  // NOVO: quando o user carrega um menu, guardamos a key para editar (UPDATE)
  let currentEditingKey = null;

  // --- 1. VERIFICAÇÃO DE LOGIN ---
  const email = sessionStorage.getItem("usuarioEmail");
  const nome = sessionStorage.getItem("usuarioNome");
  const foto = sessionStorage.getItem("usuarioFoto");

  if (!email) {
    alert("Sessão expirada. Faz login novamente.");
    window.location.href = "index.html";
    return;
  }

  // Preencher cabeçalho
  document.getElementById("txtNome").innerText = nome;
  document.getElementById("txtEmail").innerText = email;
  document.getElementById("imgAvatar").src = foto;

  // Iniciar a aplicação
  gerarHTMLDias();
  carregarDadosServidor();

  // ===== VALIDAÇÃO OBRIGATÓRIA =====
  function validateFormOrAlert() {
    const missing = [];

    const dataInicio = (document.getElementById('data-inicio').value || '').trim();
    const dataFim = (document.getElementById('data-fim').value || '').trim();
    const descricao = (document.getElementById('descricao').value || '').trim();

    if (!dataInicio) missing.push('Data de início');
    if (!dataFim) missing.push('Data de fim');
    if (!descricao) missing.push('Descrição');

    diasSemana.forEach(dia => {
      const alm = (document.getElementById(`${dia}-almoco`).value || '').trim();
      const jan = (document.getElementById(`${dia}-jantar`).value || '').trim();
      if (!alm) missing.push(`${dia} — Almoço`);
      if (!jan) missing.push(`${dia} — Jantar`);
    });

    if (missing.length) {
      alert('❌ Não é possível gravar. Faltam preencher:\n\n- ' + missing.join('\n- '));
      return false;
    }
    return true;
  }

  // ===== LIMPAR FORMULÁRIO (e sair do modo edição) =====
  function clearForm() {
    document.getElementById('data-inicio').value = '';
    document.getElementById('data-fim').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('publicFlag').checked = false;

    diasSemana.forEach(dia => {
      document.getElementById(`${dia}-almoco`).value = '';
      document.getElementById(`${dia}-jantar`).value = '';
    });

    // NOVO: ao limpar, volta a modo CREATE
    currentEditingKey = null;
  }

  // --- 2. GERAR HTML DOS DIAS ---
  function gerarHTMLDias() {
    const container = document.getElementById('gridDias');
    let html = '';

    diasSemana.forEach(dia => {
      const diaNome = dia.charAt(0).toUpperCase() + dia.slice(1);

      html += `
        <div class="dia-card">
          <h3>${diaNome}</h3>
          <div class="refeicao-grupo">
            <label><i class="fas fa-sun" style="color:#f1c40f"></i> Almoço</label>
            <input type="text" id="${dia}-almoco" placeholder="O que vais almoçar?">
          </div>
          <div class="refeicao-grupo">
            <label><i class="fas fa-moon" style="color:#2c3e50"></i> Jantar</label>
            <input type="text" id="${dia}-jantar" placeholder="O que vais jantar?">
          </div>
        </div>`;
    });

    container.innerHTML = html;
  }

  // --- 3. CARREGAR DADOS DO SERVIDOR (GET) ---
  async function carregarDadosServidor() {
    try {
      const resposta = await fetch(`/api/dados/${email}`);
      const dados = await resposta.json();

      const existingDiv = document.getElementById('existing-menus');
      existingDiv.innerHTML = '';

      if (dados && Array.isArray(dados.menus) && dados.menus.length) {
        menusList = dados.menus;

        existingDiv.innerHTML = menusList.map(m => {
          // 1. Define o título (Tenta descrição -> Tenta título -> Fallback)
          const nomeMenu = (m.menu && m.menu.descricao) 
              ? m.menu.descricao 
              : (m.menu && m.menu.titulo ? m.menu.titulo : 'Menu Sem Nome');

          return `
            <div id="item-${m.key}" class="existing-item" style="margin-bottom:6px">
              <strong style="font-size: 0.95rem;">${nomeMenu}</strong>
              
              <div style="display:flex; gap: 8px;">
              <button onclick="carregarMenu('${m.key}')">Editar</button>
                <button onclick="apagarMenu('${m.key}')" style="color:#f87171">Apagar</button>
              </div>
            </div>`;
        }).join('');
      } else {
        menusList = [];
      }

      // Mostrar a interface
      document.getElementById('loading').style.display = 'none';
      document.getElementById('conteudo-privado').style.display = 'block';

    } catch (erro) {
      console.error("Erro ao carregar:", erro);
      alert("Erro ao ligar ao servidor.");
    }
  }

  // Carrega um menu específico -> entra em modo UPDATE
  function carregarMenu(key) {
    const item = menusList.find(m => m.key === key);
    if (!item) return;

    currentEditingKey = key; // NOVO: agora "Gravar" fará UPDATE

    const menu = item.menu;
    document.getElementById('data-inicio').value = menu['data-inicio'] || '';
    document.getElementById('data-fim').value = menu['data-fim'] || '';
    document.getElementById('descricao').value = menu.descricao || '';
    document.getElementById('publicFlag').checked = !!menu.public;

    const menuSemanal = (menu.dias && menu.dias[0]) ? menu.dias[0] : null;
    if (menuSemanal) {
      diasSemana.forEach(dia => {
        if (menuSemanal[dia]) {
          document.getElementById(`${dia}-almoco`).value = menuSemanal[dia].almoco || "";
          document.getElementById(`${dia}-jantar`).value = menuSemanal[dia].jantar || "";
        } else {
          document.getElementById(`${dia}-almoco`).value = "";
          document.getElementById(`${dia}-jantar`).value = "";
        }
      });
    }
  }

  // Apagar um menu
  async function apagarMenu(key) {
    if (!confirm('Tem a certeza que quer apagar este menu?')) return;

    try {
      const resposta = await fetch(`/api/menu/${encodeURIComponent(key)}`, { method: 'DELETE' });

      if (resposta.ok) {
        menusList = menusList.filter(m => m.key !== key);
        const el = document.getElementById(`item-${key}`);
        if (el) el.remove();

        // Se estava a editar este menu, volta a modo CREATE e limpa
        if (currentEditingKey === key) {
          clearForm();
        }

        alert('Menu apagado com sucesso.');
      } else {
        alert('Erro ao apagar menu.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao apagar.');
    }
  }

  // --- 4. GRAVAR DADOS NO SERVIDOR (CREATE ou UPDATE) ---
  async function gravarMenu() {
    if (!validateFormOrAlert()) return;

    const novoMenu = {};
    diasSemana.forEach(dia => {
      novoMenu[dia] = {
        almoco: document.getElementById(`${dia}-almoco`).value.trim(),
        jantar: document.getElementById(`${dia}-jantar`).value.trim()
      };
    });

    const dataInicio = document.getElementById('data-inicio').value.trim();
    const dataFim = document.getElementById('data-fim').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const publicFlag = document.getElementById('publicFlag').checked;

    // NOVO: decide CREATE vs UPDATE
    const isUpdate = !!currentEditingKey;
    const url = isUpdate
      ? `/api/menu/${encodeURIComponent(currentEditingKey)}`
      : '/api/menu';
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const resposta = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          menuSemanal: novoMenu,
          descricao: descricao,
          'data-inicio': dataInicio,
          'data-fim': dataFim,
          public: publicFlag
        })
      });

      if (!resposta.ok) {
        alert("❌ Erro ao gravar.");
        return;
      }

      // Mensagem diferenciada (para o professor)
      alert(isUpdate ? "✅ Menu ATUALIZADO (UPDATE) com sucesso!" : "✅ Menu CRIADO (CREATE) com sucesso!");

      // Mantém a sua regra: limpar tudo após gravar
      clearForm();

      // Atualiza a lista de menus na UI (para refletir create/update)
      await carregarDadosServidor();

    } catch (erro) {
      console.error(erro);
      alert("Erro de comunicação com a API.");
    }
  }

  function logout() {
    sessionStorage.clear();
    window.location.href = "index.html";
  }

  // Expor funções
  window.gravarMenu = gravarMenu;
  window.carregarMenu = carregarMenu;
  window.apagarMenu = apagarMenu;
  window.logout = logout;
};
