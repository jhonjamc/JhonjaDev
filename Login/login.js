const authTabs = document.getElementById('authTabs');
const tabSignin = document.getElementById('tabSignin');
const tabSignup = document.getElementById('tabSignup');
const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');
const signupSuccess = document.getElementById('signupSuccess');
const signupSuccessMsg = document.getElementById('signupSuccessMsg');
const goToSigninBtn = document.getElementById('goToSigninBtn');

function showSignin() {
  authTabs.style.display = 'flex';
  tabSignin.classList.add('active');
  tabSignup.classList.remove('active');
  signinForm.style.display = 'block';
  signupForm.style.display = 'none';
  signupSuccess.classList.remove('show');
}
function showSignup() {
  authTabs.style.display = 'flex';
  tabSignup.classList.add('active');
  tabSignin.classList.remove('active');
  signupForm.style.display = 'block';
  signinForm.style.display = 'none';
  signupSuccess.classList.remove('show');
}

tabSignin.addEventListener('click', showSignin);
tabSignup.addEventListener('click', showSignup);
goToSigninBtn.addEventListener('click', showSignin);

const params = new URLSearchParams(window.location.search);
const redirectTo = params.get('redirect'); // 'planes' | 'contacto' | null
const selectedPlan = params.get('plan');   // 'pro' | 'plus' | 'premium' | null

// Si vino desde un CTA de planes/contacto, arrancar en "Crear cuenta"
if (redirectTo) showSignup();

/* ==========================================================
   Supabase
   ⚠️ Importante: la variable NO se llama "supabase" porque el
   SDK del CDN ya crea una variable global con ese nombre.
   Si acá también se declara "let supabase", el navegador tira
   "Identifier 'supabase' has already been declared" y se
   rompe TODO el script (por eso los tabs tampoco funcionaban).
   ========================================================== */
const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';

// ⚠️ Tiene que ser EXACTAMENTE el mismo email que usás en schema.sql
// para las políticas de admin (auth.jwt() ->> 'email' = '...').
const ADMIN_EMAIL = 'jhonjamoguea@icloud.com';

function translateAuthError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) return 'Ya existe una cuenta con ese email. Iniciá sesión.';
  if (m.includes('duplicate') && m.includes('documento')) return 'Ese número de documento ya está registrado.';
  if (m.includes('duplicate')) return 'Ese documento o email ya está registrado.';
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('invalid') && m.includes('email')) return 'Ese email no es válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Esperá un minuto y probá de nuevo.';
  if (m.includes('signups') && m.includes('disabled')) return 'El registro está deshabilitado en este momento.';
  if (!message || m === '{}') return 'Ese documento o email ya está registrado, o hubo un problema temporal. Probá de nuevo.';
  // Si no reconocemos el error, mostramos el mensaje real de Supabase
  // en vez de un genérico que no dice nada.
  return message || 'No se pudo crear la cuenta. Probá de nuevo.';
}

let supabaseClient = null;
let supabaseReady = false;

try {
  if (!window.supabase) throw new Error('SDK de Supabase no cargó (revisá tu conexión a internet).');
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
} catch (err) {
  console.warn('Supabase no está listo:', err.message);
  showConfigWarning(err.message);
}

function showConfigWarning(message) {
  const notice = document.createElement('div');
  notice.className = 'form-error show';
  notice.style.marginBottom = '18px';
  notice.textContent = message;
  document.querySelector('.login-card').prepend(notice);
}

function routeAfterAuth(user) {
  if (selectedPlan) sessionStorage.setItem('planSeleccionado', selectedPlan);

  if (redirectTo === 'planes' || redirectTo === 'contacto') {
    window.location.href = '../Index/index.html#contacto';
    return;
  }

  const isAdmin = (user?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  window.location.href = isAdmin
    ? '../Proyectos/proyectos.html'
    : '../Portal/portal.html';
}

// Si ya hay sesión activa, saltar el login directamente
if (supabaseReady) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) routeAfterAuth(data.session.user);
  });
}

/* ---- iniciar sesión (documento + contraseña) ---- */
signinForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const errorBox = document.getElementById('signinError');
  const btn = document.getElementById('signinBtn');
  errorBox.classList.remove('show');

  if (!supabaseReady) {
    errorBox.textContent = 'Todavía no está conectado Supabase. Completá la configuración primero.';
    errorBox.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Ingresando…';

  const documento = document.getElementById('siDocumento').value.trim();
  const password = document.getElementById('siPass').value;

  // Supabase Auth solo entiende email+password. Acá resolvemos
  // "documento" al email real usando la función SQL email_por_documento.
  const { data: email, error: lookupError } = await supabaseClient.rpc('email_por_documento', { doc: documento });

  if (lookupError || !email) {
    errorBox.textContent = 'No encontramos una cuenta con ese número de documento.';
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Ingresar';
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    const m = (error.message || '').toLowerCase();
    errorBox.textContent = m.includes('email not confirmed')
      ? 'Confirmá tu email antes de ingresar (revisá tu bandeja de entrada).'
      : 'Documento o contraseña incorrectos.';
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Ingresar';
    return;
  }

  routeAfterAuth(data.user);
});

/* ---- crear cuenta (clientes) ---- */
signupForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const errorBox = document.getElementById('signupError');
  const btn = document.getElementById('signupBtn');
  errorBox.classList.remove('show');

  if (!supabaseReady) {
    errorBox.textContent = 'Todavía no está conectado Supabase. Completá la configuración primero.';
    errorBox.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creando cuenta…';

  const nombre = document.getElementById('suName').value.trim();
  const documento = document.getElementById('suDocumento').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const telefono = document.getElementById('suPhone').value.trim();
  const password = document.getElementById('suPass').value;

  // Chequeamos ANTES de crear la cuenta, así el mensaje es específico
  // y no dependemos del error genérico que tira Supabase cuando el
  // trigger de la base de datos falla por un dato repetido.
  const [{ data: docYaExiste }, { data: emailYaExiste }] = await Promise.all([
    supabaseClient.rpc('documento_existe', { doc: documento }),
    supabaseClient.rpc('email_existe', { correo: email }),
  ]);

  if (docYaExiste) {
    errorBox.textContent = 'Ese número de documento ya está registrado. Iniciá sesión.';
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }
  if (emailYaExiste) {
    errorBox.textContent = 'Ya existe una cuenta con ese email. Iniciá sesión.';
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { nombre, documento, telefono, role: 'cliente' } }
  });

  btn.disabled = false;
  btn.textContent = 'Crear cuenta';

  if (error) {
    console.error('Error de signup:', error);
    errorBox.textContent = translateAuthError(error.message);
    errorBox.classList.add('show');
    return;
  }

  if (!data.session) {
    signupSuccessMsg.textContent = 'Revisá tu email para confirmar tu cuenta antes de ingresar.';
    authTabs.style.display = 'none';
    signupForm.style.display = 'none';
    signupSuccess.classList.add('show');
    signupForm.reset();
    return;
  }

  routeAfterAuth(data.user);
});