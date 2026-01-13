const express = require('express');
const fs = require('fs');
const path = require('path')

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('', (req, res) => {
    return res.sendFile(__dirname + '/public/index.html');
})

// GET menu data for a specific user (by email)
app.get('/api/dados/:email', (req, res) => {
    const email = req.params.email;
    const dataPath = path.join(__dirname, 'public', 'data.json');

    fs.readFile(dataPath, 'utf8', (err, content) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao ler ficheiro' });
        }
        
        try {
            const json = JSON.parse(content || '{}');
            const found = Object.keys(json)
                .filter(k => json[k] && json[k].author === email)
                .map(k => ({ key: k, menu: json[k] }));
            return res.json({ menus: found });
        } catch (e) {
            return res.status(500).json({ error: 'JSON inválido' });
        }
    });
});

// POST a new menu for a user (body: { email, menuSemanal })
app.post('/api/menu', (req, res) => {
    const body = req.body || {};

    const email = body.email;
    const menuSemanal = body.menuSemanal;
    const descricao = body.descricao || '';
    const dataInicio = body['data-inicio'] || body.dataInicio || '';
    const dataFim = body['data-fim'] || body.dataFim || '';
    const isPublic = (body.public === true) || (body.public === 'true');

    if (!email || !menuSemanal) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const dataPath = path.join(__dirname, 'public', 'data.json');
    fs.readFile(dataPath, 'utf8', (err, content) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao ler ficheiro' });
        }

        let json = {};
        try { json = JSON.parse(content || '{}'); } catch (e) { return res.status(500).json({ error: 'JSON inválido' }); }

        // Always create a new menu entry for this submission (allow multiple per user)
        const key = `menu_${Date.now()}`;
        json[key] = {
            "data-inicio": dataInicio,
            "data-fim": dataFim,
            descricao: descricao,
            public: isPublic,
            author: email,
            dias: [ menuSemanal ]
        };

        fs.writeFile(dataPath, JSON.stringify(json, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao gravar ficheiro' });
            }

            console.log('Saved menu for', email, 'key=', key);
            
            return res.json({ ok: true, saved: json[key], key: key });
        });
    });
});

// DELETE a menu by its key
app.delete('/api/menu/:key', (req, res) => {
    const key = req.params.key;
    const dataPath = path.join(__dirname, 'public', 'data.json');
    
    fs.readFile(dataPath, 'utf8', (err, content) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler ficheiro' });
        let json = {};
        
        try { 
            json = JSON.parse(content || '{}'); 
        } catch (e) { 
            return res.status(500).json({ error: 'JSON inválido' }); 
        }

        if (!json[key]) {
            return res.status(404).json({ error: 'Menu não encontrado' });
        }

        delete json[key];

        fs.writeFile(dataPath, JSON.stringify(json, null, 2), 'utf8', (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao gravar ficheiro' });
            console.log('Deleted menu', key);
            return res.json({ ok: true, deleted: key });
        });
    });
});

app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
});