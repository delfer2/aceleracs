// 1. Configurações do Supabase (Substitua com suas chaves)
const SUPABASE_URL = 'https://pgsjhesbgqcqilkxfzed.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_45-MgvqJ5Lm_YYbVM73Cdg_gk3SwUWo';

// Inicializa a instância do Supabase
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Função global para verificar a autenticação
async function checkAuth() {
  const {
    data: { session },
  } = await _supabase.auth.getSession();

  // Se NÃO houver sessão ativa e o usuário NÃO estiver na página de login, redireciona
  if (!session && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
  }
}

// Executa a verificação no exato momento em que o script carrega
checkAuth();

// 3. Função global para Logout (pode ser chamada de qualquer página)
async function fazerLogout() {
  await _supabase.auth.signOut();
  window.location.href = 'login.html';
}
