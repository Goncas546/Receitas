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
