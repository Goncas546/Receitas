// storage/fileStore.js
const fs = require('fs');
const path = require('path');

function createFileStore({ filePath }) {
  if (!filePath) throw new Error('filePath é obrigatório no createFileStore');

  let db = {};
  let writeQueue = Promise.resolve();

  function ensureFileExists() {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
  }

  function loadOnStartup() {
    try {
      ensureFileExists();
      const content = fs.readFileSync(filePath, 'utf8');
      db = JSON.parse(content || '{}');

      if (!db || typeof db !== 'object' || Array.isArray(db)) {
        console.warn('data.json inválido. A usar objeto vazio.');
        db = {};
      }

      console.log('data.json carregado para memória. Entradas:', Object.keys(db).length);
    } catch (err) {
      console.error('Erro ao carregar data.json:', err);
      db = {};
    }
  }

  function persist() {
    writeQueue = writeQueue.then(() => {
      return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(db, null, 2), 'utf8', (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    return writeQueue;
  }

  // ==========================
  // API do Store (CRUD)
  // ==========================
  function getMenusByEmail(email) {
    const found = Object.keys(db)
      .filter((k) => db[k] && db[k].author === email)
      .map((k) => ({ key: k, menu: db[k] }));
    return found;
  }

  async function createMenu({ email, menuSemanal, descricao, dataInicio, dataFim, isPublic }) {
    const key = `menu_${Date.now()}`;

    db[key] = {
      "data-inicio": dataInicio || '',
      "data-fim": dataFim || '',
      descricao: descricao || '',
      public: !!isPublic,
      author: email,
      dias: [menuSemanal]
    };

    await persist();
    return { key, menu: db[key] };
  }

  async function updateMenu({ key, email, menuSemanal, descricao, dataInicio, dataFim, isPublic }) {
    if (!db[key]) {
      const err = new Error('Menu não encontrado');
      err.status = 404;
      throw err;
    }

    // opcional: só autor pode atualizar
    if (db[key].author !== email) {
      const err = new Error('Sem permissão para atualizar este menu');
      err.status = 403;
      throw err;
    }

    const backup = db[key];

    db[key] = {
      "data-inicio": dataInicio || '',
      "data-fim": dataFim || '',
      descricao: descricao || '',
      public: !!isPublic,
      author: email,
      dias: [menuSemanal]
    };

    try {
      await persist();
      return { key, menu: db[key] };
    } catch (e) {
      db[key] = backup;
      throw e;
    }
  }

  async function deleteMenu(key) {
    if (!db[key]) {
      const err = new Error('Menu não encontrado');
      err.status = 404;
      throw err;
    }

    const backup = db[key];
    delete db[key];

    try {
      await persist();
      return { deleted: key };
    } catch (e) {
      db[key] = backup;
      throw e;
    }
  }

  // carregar ao criar o store
  loadOnStartup();

  return {
    getMenusByEmail,
    createMenu,
    updateMenu,
    deleteMenu,

    // opcional (debug)
    _getAll: () => db
  };
}

module.exports = { createFileStore };
