/* ==========================================================
   1) UI de pestañas primero — no depende de Supabase.
      Así "Iniciar sesión" / "Crear cuenta" siempre funcionan,
      incluso si el SDK de Supabase no llegó a cargar.
   ========================================================== */

const tabSignin = document.getElementById('tabSignin');
const tabSignup = document.getElementById('tabSignup');
const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');

tabSignin.addEventListener('click', () => {
  tabSignin.classList.add('active');
  tabSignup.classList.remove('active');
  signinForm.style.display = 'block';
  signupForm.style.display = 'none';
});
tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active');
  tabSignin.classList.remove('active');
  signupForm.style.display = 'block';
  signinForm.style.display = 'none';
});

const params = new URLSearchParams(window.location.search);
const redirectTo = params.get('redirect'); // 'planes' | 'contacto' | null
const selectedPlan = params.get('plan');   // 'pro' | 'plus' | 'premium' | null

// Si vino desde un CTA de planes/contacto, arrancar en "Crear cuenta"
if (redirectTo) tabSignup.click();

/* ==========================================================
   2) Supabase — recién ahora. Si falla (todavía no configuraste
      tu proyecto real), se avisa en pantalla en vez de romper
      el resto del formulario.
   ========================================================== */
// ⚠️ Reemplazá estos dos valores con los de tu proyecto Supabase
// (Project Settings → API → Project URL / anon public key)
const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';

let supabase = null;
let supabaseReady = false;

try {
  if (!window.supabase) throw new Error('SDK de Supabase no cargó (revisá tu conexión a internet).');
  if (SUPABASE_URL.includes('https://ydpvldprmcllxiifvcmq.supabase.co') || SUPABASE_ANON_KEY.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao')) {
    throw new Error('Todavía no configuraste tu proyecto real de Supabase en este archivo.');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

  const role = user?.user_metadata?.role;
  window.location.href = role === 'admin'
    ? '../Proyectos/proyectos.html'
    : '../Portal/portal.html';
}

// Si ya hay sesión activa, saltar el login directamente
if (supabaseReady) {
  supabase.auth.getSession().then(({ data }) => {
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorBox.textContent = 'Email o contraseña incorrectos.';
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre: nombre, role: 'cliente' } }
  });

  if (error) {
    errorBox.textContent = error.message.includes('already registered')
      ? 'Ya existe una cuenta con ese email. Iniciá sesión.'
      : 'No se pudo crear la cuenta. Probá de nuevo.';
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }

  if (!data.session) {
    alert('Cuenta creada. Revisá tu email para confirmar antes de ingresar.');
    tabSignin.click();
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }

  routeAfterAuth(data.user);
});