window.onload = function() {
    // Lista de dias para gerar o HTML automaticamente
        const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
        let menusList = []; // armazenar menus retornados pelo servidor
        
        // --- 1. VERIFICAÇÃO DE LOGIN ---
        const email = sessionStorage.getItem("usuarioEmail");
        const nome = sessionStorage.getItem("usuarioNome");
        const foto = sessionStorage.getItem("usuarioFoto");

        if (!email) {
            alert("Sessão expirada. Faz login novamente.");
            window.location.href = "index.html";
        } else {
            // Preencher cabeçalho
            document.getElementById("txtNome").innerText = nome;
            document.getElementById("txtEmail").innerText = email;
            document.getElementById("imgAvatar").src = foto;
            
            // Iniciar a aplicação
            gerarHTMLDias();
            carregarDadosServidor();
        }

        // --- 2. GERAR HTML DOS DIAS (Para não repetir código manualmente) ---
        function gerarHTMLDias() {
            const container = document.getElementById('gridDias');
            let html = '';

            diasSemana.forEach(dia => {
                // Capitalizar primeira letra (ex: segunda -> Segunda)
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
                // Chama a API que criaste no server.js
                const resposta = await fetch(`/api/dados/${email}`);
                const dados = await resposta.json();

                if (dados) {
                    // Se a API devolveu múltiplos menus
                    if (Array.isArray(dados.menus) && dados.menus.length) {
                        menusList = dados.menus;
                        const existingDiv = document.getElementById('existing-menus');
                        existingDiv.innerHTML = menusList.map(m => {
                            const desc = m.menu && m.menu.descricao ? ` — ${m.menu.descricao}` : '';
                            return `<div id="item-${m.key}" class="existing-item" style="margin-bottom:6px"><strong>${m.key}</strong>${desc} <button onclick="carregarMenu('${m.key}')">Carregar</button> <button onclick="apagarMenu('${m.key}')" style="color:#b91c1c">Apagar</button></div>`;
                        }).join('');

                        // Prefill with the most recent menu
                        const last = menusList[menusList.length - 1].menu;
                        if (last) {
                            document.getElementById('data-inicio').value = last['data-inicio'] || '';
                            document.getElementById('data-fim').value = last['data-fim'] || '';
                            document.getElementById('descricao').value = last.descricao || '';
                            document.getElementById('publicFlag').checked = !!last.public;

                            const menuSemanal = (last.dias && last.dias[0]) ? last.dias[0] : null;
                            if (menuSemanal) {
                                diasSemana.forEach(dia => {
                                    if (menuSemanal[dia]) {
                                        document.getElementById(`${dia}-almoco`).value = menuSemanal[dia].almoco || "";
                                        document.getElementById(`${dia}-jantar`).value = menuSemanal[dia].jantar || "";
                                    }
                                });
                            }
                        }

                    } else {
                        // Compatibilidade: caso a API devolva um único menu (antigo formato)
                        const menu = dados.menu || null;
                        const menuSemanal = menu ? ((menu.dias && menu.dias[0]) ? menu.dias[0] : null) : (dados.menuSemanal || null);

                        if (menu) {
                            document.getElementById('data-inicio').value = menu['data-inicio'] || '';
                            document.getElementById('data-fim').value = menu['data-fim'] || '';
                            document.getElementById('descricao').value = menu.descricao || '';
                            document.getElementById('publicFlag').checked = !!menu.public;
                        }

                        if (menuSemanal) {
                            diasSemana.forEach(dia => {
                                if (menuSemanal[dia]) {
                                    document.getElementById(`${dia}-almoco`).value = menuSemanal[dia].almoco || "";
                                    document.getElementById(`${dia}-jantar`).value = menuSemanal[dia].jantar || "";
                                }
                            });
                        }
                    }
                }
                
                // Mostrar a interface
                document.getElementById('loading').style.display = 'none';
                document.getElementById('conteudo-privado').style.display = 'block';

            } catch (erro) {
                console.error("Erro ao carregar:", erro);
                alert("Erro ao ligar ao servidor.");
            }
        }

        // Carrega um menu específico da lista retornada pelo servidor
        function carregarMenu(key) {
            const item = menusList.find(m => m.key === key);
            if (!item) return;
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

        // Apagar um menu (chama o endpoint DELETE)
        async function apagarMenu(key) {
            if (!confirm('Tem a certeza que quer apagar este menu?')) return;
            try {
                const resposta = await fetch(`/api/menu/${encodeURIComponent(key)}`, { method: 'DELETE' });
                let dados = null;
                const ct = resposta.headers.get('content-type') || '';
                if (ct.includes('application/json')) {
                    try { dados = await resposta.json(); } catch (e) { console.error('JSON parse error', e); dados = null; }
                } else {
                    const txt = await resposta.text();
                    console.warn('Non-JSON response deleting menu:', txt);
                }

                if (resposta.ok) {
                    // remover da lista local e do DOM
                    menusList = menusList.filter(m => m.key !== key);
                    const el = document.getElementById(`item-${key}`);
                    if (el) el.remove();
                    // se o menu carregado corresponder, limpar formulário
                    const descricaoVal = document.getElementById('descricao').value || '';
                    if (descricaoVal === (dados.deleted || '')) {
                        // não faz nada específico; limpa o formulário por segurança
                        document.getElementById('data-inicio').value = '';
                        document.getElementById('data-fim').value = '';
                        document.getElementById('descricao').value = '';
                        document.getElementById('publicFlag').checked = false;
                        diasSemana.forEach(dia => {
                            document.getElementById(`${dia}-almoco`).value = '';
                            document.getElementById(`${dia}-jantar`).value = '';
                        });
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

        // --- 4. GRAVAR DADOS NO SERVIDOR (POST) ---
        async function gravarMenu() {
            const novoMenu = {};

            // Recolher valores de todos os inputs
            diasSemana.forEach(dia => {
                novoMenu[dia] = {
                    almoco: document.getElementById(`${dia}-almoco`).value,
                    jantar: document.getElementById(`${dia}-jantar`).value
                };
            });

            try {
                const dataInicio = document.getElementById('data-inicio').value;
                const dataFim = document.getElementById('data-fim').value;
                const descricao = document.getElementById('descricao').value;
                const publicFlag = document.getElementById('publicFlag').checked;

                const resposta = await fetch('/api/menu', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email, // Identifica quem está a gravar
                            menuSemanal: novoMenu,
                            descricao: descricao,
                            'data-inicio': dataInicio,
                            'data-fim': dataFim,
                            public: publicFlag
                        })
                    });

                if (resposta.ok) {
                    alert("✅ Menu atualizado com sucesso!");
                } else {
                    alert("❌ Erro ao gravar.");
                }
            } catch (erro) {
                console.error(erro);
                alert("Erro de comunicação com a API.");
            }
        }

        function logout() {
            sessionStorage.clear();
            window.location.href = "index.html";
        }

        // --- SUGESTÕES DE RECEITAS (Spoonacular) ---
        const SPOON_API_KEY = '82872ab9b342448aa4c956cd2c4d7f28';

        async function loadRecipeSuggestions() {
            const container = document.getElementById('recipe-suggestions');
            container.innerHTML = '<em>Carregando sugestões...</em>';
            try {
                const res = await fetch(`https://api.spoonacular.com/recipes/random?number=6&apiKey=${SPOON_API_KEY}`);
                if (!res.ok) throw new Error('Erro ao buscar receitas');
                const data = await res.json();
                const list = data.recipes || [];
                container.innerHTML = list.map(r => {
                    const title = escapeHtml(r.title || 'Receita');
                    const img = r.image ? `<img src="${r.image}" alt="${title}" style="width:100%;height:100px;object-fit:cover;border-radius:6px">` : '';
                    return `<div class="recipe-card" style="background:#fff;padding:8px;border-radius:8px;box-shadow:0 6px 14px rgba(2,6,23,0.06);text-align:left"><div style="height:100px;overflow:hidden">${img}</div><h4 style="margin:8px 0 6px 0;font-size:0.95rem">${title}</h4><button onclick="addRecipeToPlan('${escapeAttr(r.title)}')">Adicionar</button></div>`;
                }).join('');
            } catch (err) {
                console.error(err);
                container.innerHTML = '<div>Erro ao carregar sugestões.</div>';
            }
        }

        // Escapa para atributo em onclick
        function escapeAttr(s) { return String(s).replace(/'/g, "\\'").replace(/\"/g,'\\\"'); }

        // Escapa texto para inserir como HTML seguro
        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Adiciona o nome da receita à primeira refeição vazia do plano (almoco then jantar, por dia ordem)
        function addRecipeToPlan(name) {
            const order = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
            for (const dia of order) {
                const alm = document.getElementById(`${dia}-almoco`);
                if (alm && !alm.value) { alm.value = name; return; }
                const jan = document.getElementById(`${dia}-jantar`);
                if (jan && !jan.value) { jan.value = name; return; }
            }
            alert('Não há campos vazios no plano.');
        }

        // Carregar sugestões após a interface ficar disponível
        (function() {
            const observer = new MutationObserver(() => {
                if (document.getElementById('conteudo-privado') && document.getElementById('conteudo-privado').style.display !== 'none') {
                    loadRecipeSuggestions();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        })();

    // Expor funções para o escopo global (usadas por onclick inline)
    window.gravarMenu = gravarMenu;
    window.carregarMenu = carregarMenu;
    window.apagarMenu = apagarMenu;
    window.logout = logout;
    window.addRecipeToPlan = addRecipeToPlan;

}