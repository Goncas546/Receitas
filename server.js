const express = require('express');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/api/receitas', (req, res) => {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        } else {
            res.json(JSON.parse(data));
        }
    })
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});