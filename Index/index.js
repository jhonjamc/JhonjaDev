(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- auth gate (planes + contacto exigen sesión) ---- */
  var SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';
  var ADMIN_EMAIL = 'jhonjamoguea@icloud.com';
  var supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
  var currentSession = null;

  function updateAccountLinks() {
    var isAdmin = currentSession && (currentSession.user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
    var destino = currentSession ? (isAdmin ? '../Proyectos/proyectos.html' : '../Portal/portal.html') : '../Login/login.html';
    var texto = currentSession ? 'Mi cuenta' : 'Iniciar sesión';
    document.querySelectorAll('.nav-account-link').forEach(function (el) {
      el.href = destino;
      el.textContent = texto;
      el.classList.remove('is-loading');
    });
  }

  if (supabaseClient) {
    supabaseClient.auth.getSession().then(function(res){ currentSession = res.data.session; updateAccountLinks(); });
    supabaseClient.auth.onAuthStateChange(function(_event, session){ currentSession = session; updateAccountLinks(); });
  }

  function goToLogin(gate, plan) {
    var url = '../Login/login.html?redirect=' + encodeURIComponent(gate);
    if (plan) url += '&plan=' + encodeURIComponent(plan);
    window.location.href = url;
  }

  document.querySelectorAll('[data-gate]').forEach(function(el){
    if (el.tagName === 'FORM') {
      el.addEventListener('submit', function(e){
        if (!currentSession) {
          e.preventDefault();
          goToLogin(el.getAttribute('data-gate'));
        }
        // si hay sesión, sigue el flujo normal de envío más abajo
      }, true); // capture: corre antes que el listener de envío del formulario
    } else {
      el.addEventListener('click', function(e){
        if (!currentSession) {
          e.preventDefault();
          goToLogin(el.getAttribute('data-gate'), el.getAttribute('data-plan'));
        }
        // si hay sesión, el <a href="#contacto"> navega normal
      });
    }
  });

  /* ---- preseleccionar plan si venís del login ---- */
  var savedPlan = sessionStorage.getItem('planSeleccionado');
  if (savedPlan) {
    var planMap = {
      pro: 'Plan Pro — $250.000',
      plus: 'Plan Plus — $450.000',
      premium: 'Plan Premium — $700.000'
    };
    var select = document.getElementById('fplan');
    if (select && planMap[savedPlan]) {
      Array.from(select.options).forEach(function(opt){
        if (opt.textContent.trim() === planMap[savedPlan]) select.value = opt.value;
      });
    }
    sessionStorage.removeItem('planSeleccionado');
  }

  /* ---- header scroll state ---- */
  var header = document.getElementById('siteHeader');
  function onScroll(){
    header.classList.toggle('scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* ---- mobile menu ---- */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', function(){
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  /* ---- scroll reveal ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---- hero code typewriter ---- */
  var codeBody = document.getElementById('codeBody');
  var previewPane = document.getElementById('previewPane');
  var codeLines = [
    {t:'<span class="tok-comment">&lt;!-- construyendo tu web --&gt;</span>'},
    {t:'<span class="tok-punc">&lt;</span><span class="tok-tag">section</span> <span class="tok-attr">class</span><span class="tok-punc">=</span><span class="tok-str">"hero"</span><span class="tok-punc">&gt;</span>'},
    {t:'&nbsp;&nbsp;<span class="tok-punc">&lt;</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>Hola, somos tu negocio.<span class="tok-punc">&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>'},
    {t:'&nbsp;&nbsp;<span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Una web hecha para vender.<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>'},
    {t:'&nbsp;&nbsp;<span class="tok-punc">&lt;</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>Contactar<span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>'},
    {t:'<span class="tok-punc">&lt;/</span><span class="tok-tag">section</span><span class="tok-punc">&gt;</span>'}
  ];

  function typeLines(){
    if(reduceMotion){
      var html = '';
      codeLines.forEach(function(l, i){
        html += '<span class="ln">'+String(i+1).padStart(2,'0')+'</span>'+l.t+'\n';
      });
      codeBody.innerHTML = html;
      previewPane.classList.add('show');
      return;
    }
    var lineIndex = 0;
    var charIndex = 0;
    codeBody.innerHTML = '';

    function step(){
      if(lineIndex >= codeLines.length){
        setTimeout(function(){ previewPane.classList.add('show'); }, 500);
        return;
      }
      var full = codeLines[lineIndex].t;
      var visible = revealChars(full, charIndex);
      redraw(visible);
      charIndex += 3;
      if(charIndex >= stripTags(full).length){
        lineIndex++;
        charIndex = 0;
        setTimeout(step, 90);
      } else {
        setTimeout(step, 14);
      }
    }

    function stripTags(html){
      var div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || '';
    }

    function revealChars(fullHtml, count){
      var totalText = stripTags(fullHtml).length;
      var ratio = Math.min(count / Math.max(totalText,1), 1);
      return {html: fullHtml, ratio: ratio};
    }

    function redraw(current){
      var out = '';
      for(var i=0; i<lineIndex; i++){
        out += '<span class="ln">'+String(i+1).padStart(2,'0')+'</span>'+codeLines[i].t+'\n';
      }
      var temp = document.createElement('div');
      temp.innerHTML = current.html;
      var full = temp.textContent;
      var count = Math.round(full.length * current.ratio);
      out += '<span class="ln">'+String(lineIndex+1).padStart(2,'0')+'</span>' + (count >= full.length ? current.html : truncateHtml(current.html, count)) + '<span class="caret"></span>';
      codeBody.innerHTML = out;
      codeBody.parentElement.scrollTop = codeBody.parentElement.scrollHeight;
    }

    function truncateHtml(html, maxChars){
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var remaining = maxChars;
      (function walk(node){
        for(var i=0; i<node.childNodes.length; i++){
          var child = node.childNodes[i];
          if(remaining <= 0){
            while(node.childNodes[i]){ node.removeChild(node.childNodes[i]); }
            return;
          }
          if(child.nodeType === 3){
            var text = child.textContent;
            if(text.length > remaining){
              child.textContent = text.slice(0, remaining);
              remaining = 0;
            } else {
              remaining -= text.length;
            }
          } else if(child.nodeType === 1){
            walk(child);
          }
        }
      })(temp);
      return temp.innerHTML;
    }

    step();
  }

  if('IntersectionObserver' in window){
    var codeIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          typeLines();
          codeIO.disconnect();
        }
      });
    }, {threshold:0.4});
    codeIO.observe(document.getElementById('codeWindow'));
  } else {
    typeLines();
  }

  /* ---- contact form: guarda de verdad en Supabase (tabla contactos) ---- */
  var form = document.getElementById('contactForm');
  var submitBtn = document.getElementById('submitBtn');
  var successBox = document.getElementById('formSuccess');
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(!form.checkValidity()){ form.reportValidity(); return; }
    if(!currentSession || !supabaseClient){
      // el gate de arriba debería haber interceptado esto antes,
      // pero por las dudas no dejamos pasar un envío sin sesión.
      goToLogin('contacto');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    var nombre = document.getElementById('fname').value.trim();
    var email = document.getElementById('femail').value.trim();
    var plan = document.getElementById('fplan').value;
    var mensaje = document.getElementById('fmsg').value.trim();

    try {
      // Buscamos la fila de "clientes" del usuario logueado (la crea
      // automáticamente el trigger de Supabase apenas se registra).
      var { data: cliente, error: clienteError } = await supabaseClient
        .from('clientes')
        .select('id')
        .eq('user_id', currentSession.user.id)
        .single();

      if (clienteError || !cliente) throw clienteError || new Error('No se encontró el cliente');

      var { error: insertError } = await supabaseClient
        .from('contactos')
        .insert({
          cliente_id: cliente.id,
          nombre: nombre,
          email: email,
          plan_interes: plan,
          mensaje: mensaje,
          estado: 'nuevo'
        });

      if (insertError) throw insertError;

      form.style.display = 'none';
      successBox.classList.add('show');
    } catch (err) {
      console.error('Error guardando el contacto:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar mensaje';
      alert('No se pudo enviar el mensaje. Probá de nuevo en un momento.');
    }
  });

  /* ---- plan card magnetic tilt (subtle) ---- */
  if(window.matchMedia('(pointer:fine)').matches && !reduceMotion){
    document.querySelectorAll('.plan').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'translateY(-8px) rotateX(' + (y * -3) + 'deg) rotateY(' + (x * 3) + 'deg)';
      });
      card.addEventListener('mouseleave', function(){
        card.style.transform = '';
      });
    });
  }
})();