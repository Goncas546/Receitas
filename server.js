const express = require('express');
const path = require('path');
require('dotenv').config();
const { createFileStore } = require('./storage/fileStore');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Página principal
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar o store (ficheiro data.json)
const store = createFileStore({
  filePath: path.join(__dirname, 'public', 'data.json')
});

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
    const email = body.email;
    const menuSemanal = body.menuSemanal;
    const titulo = body.titulo || '';
    const dataInicio = body['data-inicio'] || body.dataInicio || '';
    const dataFim = body['data-fim'] || body.dataFim || '';
    const isPublic = (body.public === true) || (body.public === 'true');

    if (!email || !menuSemanal) {
      return res.status(400).json({ error: 'Parâmetros inválidos (email e menuSemanal são obrigatórios)' });
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
    const isPublic = (body.public === true) || (body.public === 'true');

    if (!email || !menuSemanal) {
      return res.status(400).json({ error: 'Parâmetros inválidos (email e menuSemanal são obrigatórios)' });
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
