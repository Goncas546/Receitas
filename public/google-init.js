async function getGoogleConfig() {
  try {
    // Faz um pedido à rota que criámos no passo 1
    const response = await fetch('/api/config');
    
    if (!response.ok) throw new Error('Falha ao obter config');
    
    const data = await response.json();
    return data.clientId;
  } catch (error) {
    console.error('Erro ao carregar Client ID:', error);
    return null;
  }
}

async function onGoogleLoad() {
  if (!window.google || !google.accounts || !google.accounts.id) return;

  // AQUI É A MAGIA: Esperamos que a chave venha do servidor
  const clientId = await getGoogleConfig();

  if (!clientId) {
    console.error('Abortar: Client ID não disponível');
    return;
  }

  // Agora inicializamos com a chave segura
  google.accounts.id.initialize({
    client_id: clientId, 
    callback: handleCredentialResponse,
    cancel_on_tap_outside: false
  });

  google.accounts.id.renderButton(
    document.getElementById("botaoGoogleDiv"),
    {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 250
    }
  );
}

function handleCredentialResponse(response) {
  const dados = decodeJwtResponse(response.credential);
  sessionStorage.setItem("usuarioEmail", dados.email);
  sessionStorage.setItem("usuarioNome", dados.name);
  sessionStorage.setItem("usuarioFoto", dados.picture);
  window.location.href = "admin.html";
}

function decodeJwtResponse(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

if (window.google && google.accounts && google.accounts.id) onGoogleLoad();