// DADOS
let receitas = JSON.parse(localStorage.getItem("receitas")) || [];
let menuSemanal = JSON.parse(localStorage.getItem("menu")) || [];

// LOGIN
function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  if (user === "admin" && pass === "1234") {
    localStorage.setItem("logado", "true");
    window.location.href = "admin.html";
  } else {
    document.getElementById("msg").innerText = "Login inválido";
  }
}

function verificarLogin() {
  if (localStorage.getItem("logado") !== "true") {
    window.location.href = "login.html";
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("logado");
  window.location.href = "index.html";
}

// RECEITAS
function adicionarReceita() {
  const r = {
    nome: nome.value,
    ingredientes: ingredientes.value,
    tempo: tempo.value,
    alergenios: alergenios.value
  };
  receitas.push(r);
  localStorage.setItem("receitas", JSON.stringify(receitas));
  alert("Receita adicionada!");
}

// LISTAR + FILTROS
function filtrarReceitas() {
  const ing = filtroIngrediente.value.toLowerCase();
  const tempoMax = filtroTempo.value;
  const alerg = filtroAlergenio.value.toLowerCase();

  listaReceitas.innerHTML = "";

  receitas.filter(r =>
    r.ingredientes.toLowerCase().includes(ing) &&
    (tempoMax === "" || r.tempo <= tempoMax) &&
    !r.alergenios.toLowerCase().includes(alerg)
  ).forEach(r => {
    listaReceitas.innerHTML += `<li>${r.nome} (${r.tempo} min)</li>`;
  });
}

// MENU SEMANAL
function adicionarMenu() {
  menuSemanal.push({
    dia: dia.value,
    receita: receitaDia.value
  });
  localStorage.setItem("menu", JSON.stringify(menuSemanal));
  mostrarMenu();
}

function mostrarMenu() {
  menu.innerHTML = "";
  menuSemanal.forEach(m => {
    menu.innerHTML += `<li>${m.dia}: ${m.receita}</li>`;
  });
}

const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./auth');

const app = express();

// Função que verifica se o utilzador tem login feito ou não
// Quando o utilizador efetua login, o req.user é preenchido de forma automática
// Caso o utilizador exista, continua o método
// Caso não existia envia 401 na resposta
function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
// Conecta Passport com as sessões para que o login persista entre os requests
app.use(passport.session());

// Página inicial
app.get('/', (req, res) => {
    res.send('<a href="/auth/google">Authenticate with Google</a>')
})

// Inicia o Google OAuth
// User é redirecionado p/ o ecrã de login e consentimento da Google
// scope - Indica quais os campos a que a aplicação está a pedir acesso, neste caso Perfil e Email
app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }))

// Para onde o utilizador será reencaminhado depois de efetuar o login na página da google
// Caso o login seja efetuado com sucesso será encaminhado para /protected
// Caso o login não seja efetuado com sucesso, o utilizador é redirecitonado para /auth/google/failure
app.get('/auth/google/callback', 
    passport.authenticate('google', {
        successRedirect: '/protected',
        failureRedirect: '/auth/google/failure'
    })
)

// Caso o login não seja efetuado com sucesso, mostra uma mensagem no ecrã a indicar que a autenticação falhou
app.get('/auth/google/failure', (req, res) => {
    res.send('Failed to authenticate..')
})

// Apenas poderão aceder a esta página caso o utilizador esteja com login feito
// Mostra no ecrã o nome do utilizador da sessão
app.get('/protected', isLoggedIn, (req, res) => {
    res.send(`Hello ${req.user.displayName}`)
})

app.listen(5000, () => console.log('Listening on port: 5000'))