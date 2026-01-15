const express = require('express');
const path = require('path');
require('dotenv').config();
const { createFileStore } = require('./storage/fileStore');

const app = express();
const port = 3000;

try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // SCRIPTS: Google Identity precisa destes domínios
        scriptSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://accounts.google.com/gsi/client',
          'https://apis.google.com',
          "'unsafe-inline'"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        
        // STYLES: Google e CDNs externos
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
          'https://accounts.google.com'
        ],
        
        // FONTS
        fontSrc: [
          "'self'", 
          'https://fonts.gstatic.com', 
          'https://cdnjs.cloudflare.com', 
          'data:'
        ],
        
        // IMAGENS
        imgSrc: [
          "'self'", 
          'data:', 
          'https://lh3.googleusercontent.com', // Avatares do Google
          'https://img.spoonacular.com' // Imagens da Spoonacular
        ],
        
        // CONEXÕES (AJAX/Fetch)
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://accounts.google.com/gsi/',
          'https://www.googleapis.com'
        ],
        
        // IFRAMES
        frameSrc: [
          "'self'",
          'https://accounts.google.com', // Permite a iframe do botão de login
          'https://gsi.gstatic.com'      // Ocasionalmente necessário para assets do GSI
        ],
        
        frameAncestors: ["'self'"],
        
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));
} catch (e) {
  console.warn('Helmet error:', e);
}

// Limitar tamanho do body para evitar payloads muito grandes
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Página principal
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar o store (ficheiro data.json)
const store = createFileStore({
  filePath: path.join(__dirname, 'public', 'data.json')
});

// Validação do payload de menu
function validateMenuPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push('Corpo da requisição inválido');
    return errors;
  }

  const emailRaw = body.email;
  const menuSemanal = body.menuSemanal;
  const tituloRaw = body.titulo;
  const dataInicioRaw = (body['data-inicio'] || body.dataInicio);
  const dataFimRaw = (body['data-fim'] || body.dataFim);
  const email = (typeof emailRaw === 'string') ? emailRaw.trim() : '';
  const titulo = (typeof tituloRaw === 'string') ? tituloRaw.trim() : '';
  const dataInicio = (typeof dataInicioRaw === 'string') ? dataInicioRaw.trim() : '';
  const dataFim = (typeof dataFimRaw === 'string') ? dataFimRaw.trim() : '';
  const hasPublic = typeof body.public !== 'undefined';
  if (!email) errors.push('email é obrigatório');
  else if (typeof body.email !== 'string') errors.push('email deve ser uma string');
  else {
    // validação simples de email
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(email)) errors.push('email com formato inválido');
  }

  if (!menuSemanal || typeof menuSemanal !== 'object') {
    errors.push('menuSemanal é obrigatório e deve ser um object');
  } else {
    const expectedDays = ['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
    const keys = Object.keys(menuSemanal || {});
    // Verificar presença de todos os dias esperados
    expectedDays.forEach(d => {
      if (!keys.includes(d)) errors.push(`menuSemanal: falta o dia '${d}'`);
    });

    // Se há chaves extras ou menos, reportamos, mas continuamos a validar os presentes
    expectedDays.forEach((d) => {
      const entry = menuSemanal[d];
      if (!entry || typeof entry !== 'object') {
        // já relatado acima se estiver ausente
        return;
      }

      const almRaw = entry.almoco;
      const janRaw = entry.jantar;

      if (typeof almRaw !== 'string') {
        errors.push(`campo 'almoco' em ${d} tem de ser texto`);
      } else if (!almRaw.trim()) {
        errors.push(`campo 'almoco' em ${d} é obrigatório`);
      } else if (almRaw.length > 300) {
        errors.push(`campo 'almoco' em ${d} excede comprimento máximo (300)`);
      }

      if (typeof janRaw !== 'string') {
        errors.push(`campo 'jantar' em ${d} tem de ser texto`);
      } else if (!janRaw.trim()) {
        errors.push(`campo 'jantar' em ${d} é obrigatório`);
      } else if (janRaw.length > 300) {
        errors.push(`campo 'jantar' em ${d} excede comprimento máximo (300)`);
      }
    });
  }

  if (!titulo) errors.push('titulo é obrigatório');
  else if (typeof body.titulo !== 'string') errors.push('titulo deve ser uma string');
  else if (titulo.length > 200) errors.push('titulo excede comprimento máximo (200)');

  if (!dataInicio) errors.push('data-inicio é obrigatória');
  else if (typeof (body['data-inicio'] || body.dataInicio) !== 'string') errors.push('data-inicio deve ser uma string YYYY-MM-DD');
  if (!dataFim) errors.push('data-fim é obrigatória');
  else if (typeof (body['data-fim'] || body.dataFim) !== 'string') errors.push('data-fim deve ser uma string YYYY-MM-DD');

  if (dataInicio && dataFim) {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('formato de data inválido');
    } else {
      if (start < today) errors.push('data-inicio não pode ser anterior a hoje');
      if (end < start) errors.push('data-fim não pode ser anterior à data-inicio');
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) errors.push('a diferença entre data-inicio e data-fim deve ser pelo menos 7 dias');
    }
  }
  if (!hasPublic) errors.push('public (flag) é obrigatório (true/false)');
  else if (typeof body.public !== 'boolean') errors.push('public deve ser boolean (true/false)');

  return errors;
}

app.get('/api/sugestoes', async (req, res) => {
    const apiKey = process.env.SPOONACULAR_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key não configurada no servidor' });
    }

    try {
        const response = await fetch(`https://api.spoonacular.com/recipes/random?number=5&apiKey=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`Erro API externa: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao buscar sugestões' });
    }
});

// GET menus por email
app.get('/api/dados/:email', (req, res) => {
  try {
    const email = req.params.email;
    const menus = store.getMenusByEmail(email);
    return res.json({ menus });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno ao processar dados' });
  }
});

// CREATE
app.post('/api/menu', async (req, res) => {
  try {
    const body = req.body || {};

    console.warn('Recebido POST /api/menu com body:', body);

    const email = body.email;
    const menuSemanal = body.menuSemanal;
    const titulo = body.titulo || '';
    const dataInicio = body['data-inicio'] || body.dataInicio || '';
    const dataFim = body['data-fim'] || body.dataFim || '';
    const isPublic = (body.public === true);

    // Validação completa do payload (todos os campos obrigatórios e formatos)
    const payloadErrors = validateMenuPayload(body);
    if (payloadErrors && payloadErrors.length) {
      return res.status(400).json({ error: 'Payload inválido', details: payloadErrors });
    }

    const created = await store.createMenu({
      email,
      menuSemanal,
      titulo,
      dataInicio,
      dataFim,
      isPublic
    });

    return res.json({ ok: true, action: 'create', key: created.key, saved: created.menu });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao gravar ficheiro' });
  }
});

// UPDATE
app.put('/api/menu/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const body = req.body || {};
    const email = body.email;
    const menuSemanal = body.menuSemanal;
    const titulo = body.titulo || '';
    const dataInicio = body['data-inicio'] || body.dataInicio || '';
    const dataFim = body['data-fim'] || body.dataFim || '';
    const isPublic = (body.public === true);

    // Validação completa do payload (todos os campos obrigatórios e formatos)
    const payloadErrors = validateMenuPayload(body);
    if (payloadErrors && payloadErrors.length) {
      return res.status(400).json({ error: 'Payload inválido', details: payloadErrors });
    }

    const updated = await store.updateMenu({
      key,
      email,
      menuSemanal,
      titulo,
      dataInicio,
      dataFim,
      isPublic
    });

    return res.json({ ok: true, action: 'update', key: updated.key, updated: updated.menu });
  } catch (e) {
    console.error(e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Erro ao atualizar' });
  }
});

// DELETE
app.delete('/api/menu/:key', async (req, res) => {
  try {
    const key = req.params.key;
    // Verificar explicitamente se a chave existe antes de tentar apagar
    const all = store._getAll && typeof store._getAll === 'function' ? store._getAll() : null;
    if (!all || !all[key]) {
      return res.status(404).json({ error: 'Menu não encontrado' });
    }

    // Validar autor (email) enviado no body
    const body = req.body || {};
    const requesterEmail = body.email;
    if (!requesterEmail || typeof requesterEmail !== 'string') {
      return res.status(400).json({ error: 'email do requerente é obrigatório no body' });
    }

    if (all[key].author !== requesterEmail) {
      return res.status(403).json({ error: 'Sem permissão para apagar este menu' });
    }

    const result = await store.deleteMenu(key);
    return res.json({ ok: true, deleted: result.deleted });
  } catch (e) {
    console.error(e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Erro ao apagar' });
  }
});

// Debug opcional
app.get('/api/_debug/all', (req, res) => {
  return res.json({ data: store._getAll() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
