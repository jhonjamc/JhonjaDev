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
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('invalid') && m.includes('email')) return 'Ese email no es válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Esperá un minuto y probá de nuevo.';
  if (m.includes('signups') && m.includes('disabled')) return 'El registro está deshabilitado en este momento.';
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

/* ==========================================================
   Recomendado en Supabase (SQL Editor), para que cada cliente
   que se registra desde acá tenga automáticamente su fila en
   la tabla `clientes`, vinculada a su usuario de Auth:

   create function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.clientes (user_id, nombre, email)
     values (new.id, new.raw_user_meta_data->>'nombre', new.email);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ========================================================== */

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

/* ---- iniciar sesión ---- */
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

  const email = document.getElementById('siEmail').value.trim();
  const password = document.getElementById('siPass').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    const m = (error.message || '').toLowerCase();
    errorBox.textContent = m.includes('email not confirmed')
      ? 'Confirmá tu email antes de ingresar (revisá tu bandeja de entrada).'
      : 'Email o contraseña incorrectos.';
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
  const email = document.getElementById('suEmail').value.trim();
  const password = document.getElementById('suPass').value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { nombre: nombre, role: 'cliente' } }
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
    // Reemplaza el alert() nativo por el bloque de éxito integrado al diseño
    signupSuccessMsg.textContent = 'Revisá tu email para confirmar tu cuenta antes de ingresar.';
    authTabs.style.display = 'none';
    signupForm.style.display = 'none';
    signupSuccess.classList.add('show');
    signupForm.reset();
    return;
  }

  routeAfterAuth(data.user);
});