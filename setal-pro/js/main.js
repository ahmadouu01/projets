/* =========================================================
   SETAL PRO — Scripts du site
   Aucune dépendance externe.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Année courante dans le pied de page ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Lien de navigation actif ---------- */
  (function activeLink() {
    var page = location.pathname.split('/').pop() || 'index.html';
    $$('.main-nav a[href]').forEach(function (a) {
      var href = a.getAttribute('href').split('#')[0];
      if (href && href === page) { a.classList.add('is-active'); }
    });
  })();

  /* ---------- En-tête figé au scroll ---------- */
  var header = $('.site-header');
  var toTop = $('.to-top');
  function onScroll() {
    var y = window.pageYOffset;
    if (header) { header.classList.toggle('is-stuck', y > 8); }
    if (toTop) { toTop.classList.toggle('is-visible', y > 600); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- Menu mobile ---------- */
  var navToggle = $('.nav-toggle');
  var mainNav = $('#main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mainNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- Méga-menus ---------- */
  var isTouch = window.matchMedia('(max-width: 980px)');
  $$('.nav-item').forEach(function (item) {
    var trigger = $('.nav-trigger', item);
    if (!trigger) { return; }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var open = item.classList.contains('is-open');
      $$('.nav-item').forEach(function (other) {
        other.classList.remove('is-open');
        var t = $('.nav-trigger', other);
        if (t) { t.setAttribute('aria-expanded', 'false'); }
      });
      if (!open) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    item.addEventListener('mouseenter', function () {
      if (isTouch.matches) { return; }
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    });
    item.addEventListener('mouseleave', function () {
      if (isTouch.matches) { return; }
      item.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item')) {
      $$('.nav-item.is-open').forEach(function (item) {
        item.classList.remove('is-open');
        var t = $('.nav-trigger', item);
        if (t) { t.setAttribute('aria-expanded', 'false'); }
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    $$('.nav-item.is-open').forEach(function (i) { i.classList.remove('is-open'); });
    if (mainNav && mainNav.classList.contains('is-open')) {
      mainNav.classList.remove('is-open');
      if (navToggle) { navToggle.setAttribute('aria-expanded', 'false'); }
      document.body.style.overflow = '';
    }
  });

  /* ---------- Apparition au scroll ---------- */
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Compteurs animés ---------- */
  var counters = $$('[data-count]');
  if (counters.length) {
    var animate = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var duration = 1400;
      var start = null;
      function frame(ts) {
        if (start === null) { start = ts; }
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('fr-FR');
        if (p < 1) { requestAnimationFrame(frame); }
      }
      requestAnimationFrame(frame);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animate(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(animate);
    }
  }

  /* ---------- Carrousel de témoignages ---------- */
  $$('[data-carousel]').forEach(function (carousel) {
    var track = $('.quote-track', carousel);
    var slides = $$('.quote', carousel);
    var dotsWrap = $('[data-dots]', carousel);
    if (!track || slides.length < 2) { return; }

    var index = 0;
    var timer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'quote-dot' + (i === 0 ? ' is-active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Témoignage ' + (i + 1));
      dot.addEventListener('click', function () { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      track.style.transition = 'transform .5s ease';
      $$('.quote-dot', dotsWrap).forEach(function (d, di) {
        d.classList.toggle('is-active', di === index);
      });
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, 7000);
    }
    go(0);
    restart();
    carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
    carousel.addEventListener('mouseleave', restart);
  });

  /* ---------- Accordéon ---------- */
  $$('[data-accordion]').forEach(function (acc) {
    $$('.acc-head', acc).forEach(function (head) {
      head.addEventListener('click', function () {
        var item = head.parentElement;
        var body = $('.acc-body', item);
        var open = item.classList.contains('is-open');

        $$('.acc-item', acc).forEach(function (other) {
          other.classList.remove('is-open');
          $('.acc-head', other).setAttribute('aria-expanded', 'false');
          $('.acc-body', other).style.maxHeight = null;
        });

        if (!open) {
          item.classList.add('is-open');
          head.setAttribute('aria-expanded', 'true');
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
  });

  /* ---------- Validation de formulaire ---------- */
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var RE_TEL = /^(\+?221)?[\s.-]?[0-9][\s.\-0-9]{7,}$/;

  function fieldOf(input) { return input.closest('.field'); }

  function validate(input) {
    var value = (input.value || '').trim();
    var ok = true;

    if (input.type === 'checkbox') {
      ok = !input.required || input.checked;
    } else if (input.required && !value) {
      ok = false;
    } else if (input.type === 'email' && value) {
      ok = RE_EMAIL.test(value);
    } else if (input.type === 'tel' && value) {
      ok = RE_TEL.test(value);
    } else if (input.tagName === 'TEXTAREA' && input.required) {
      ok = value.length >= 20;
    }

    var field = fieldOf(input);
    if (field) { field.classList.toggle('has-error', !ok); }
    return ok;
  }

  function validateScope(scope) {
    var inputs = $$('input[required], select[required], textarea[required]', scope);
    var valid = true;
    inputs.forEach(function (input) { if (!validate(input)) { valid = false; } });
    return valid;
  }

  function bindLiveValidation(form) {
    $$('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.required || (input.value || '').trim()) { validate(input); }
      });
      input.addEventListener('input', function () {
        var field = fieldOf(input);
        if (field && field.classList.contains('has-error')) { validate(input); }
      });
    });
  }

  function showStatus(form, message, isError) {
    var status = $('[data-status]', form) || form.parentElement.querySelector('[data-status]');
    if (!status) { return; }
    status.textContent = message;
    status.classList.add('is-visible');
    status.style.background = isError ? '#fdecea' : 'var(--green-050)';
    status.style.borderColor = isError ? '#f5c6c0' : 'var(--green-100)';
    status.style.color = isError ? '#c0392b' : 'var(--green-700)';
  }

  /* ---------- Formulaire de contact ---------- */
  var contactForm = $('#contact-form');
  if (contactForm) {
    bindLiveValidation(contactForm);
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateScope(contactForm)) {
        showStatus(contactForm, 'Merci de corriger les champs signalés en rouge.', true);
        var firstError = $('.field.has-error input, .field.has-error select, .field.has-error textarea', contactForm);
        if (firstError) { firstError.focus(); }
        return;
      }
      var nom = $('#c-nom').value.trim().split(' ')[0];
      showStatus(contactForm, 'Merci ' + nom + ' ! Votre message est parti. Un conseiller Setal Pro vous répond sous un jour ouvré.', false);
      contactForm.reset();
    });
  }

  /* ---------- Formulaire de devis en 3 étapes ---------- */
  var devisForm = $('#devis-form');
  if (devisForm) {
    var steps = $$('.form-step', devisForm);
    var stepperItems = $$('[data-stepper] li');
    var btnPrev = $('[data-prev]', devisForm);
    var btnNext = $('[data-next]', devisForm);
    var btnSubmit = $('[data-submit]', devisForm);
    var recap = $('[data-recap]', devisForm);
    var errSolutions = $('[data-error-solutions]', devisForm);
    var current = 0;

    bindLiveValidation(devisForm);

    // Pré-remplissage depuis l'URL : devis.html?solution=tapis&secteur=hotellerie
    (function prefill() {
      var params = new URLSearchParams(location.search);
      var mapSolutions = {
        'vetement-travail': 'Vêtement de travail',
        'linge-plat': 'Linge plat & hôtellerie',
        'hygiene': 'Hygiène & bien-être',
        'linge-sante': 'Linge de santé',
        'tapis': "Tapis d'entrée",
        'essuyage': 'Essuyage industriel',
        'eau-cafe': 'Fontaines à eau & café',
        '3d': 'Dératisation 3D'
      };
      var mapSecteurs = {
        'hotellerie': 'Hôtellerie & restauration',
        'sante': 'Santé',
        'industrie': 'Industrie & agroalimentaire',
        'mines': 'Mines, énergie & pétrole',
        'btp': 'BTP & construction',
        'services': 'Banques, commerces & bureaux',
        'collectivites': 'Administrations & ONG',
        'proprete': 'Propreté & facility management'
      };
      var sol = mapSolutions[params.get('solution')];
      if (sol) {
        $$('input[name="solutions"]', devisForm).forEach(function (cb) {
          if (cb.value === sol) { cb.checked = true; }
        });
      }
      var sect = mapSecteurs[params.get('secteur')];
      if (sect) {
        var select = $('#secteur', devisForm);
        $$('option', select).forEach(function (opt) {
          if (opt.textContent.trim() === sect) { select.value = opt.value || opt.textContent; }
        });
      }
    })();

    function chosenSolutions() {
      return $$('input[name="solutions"]:checked', devisForm).map(function (cb) { return cb.value; });
    }

    function showStep(i) {
      current = i;
      steps.forEach(function (step, si) { step.hidden = si !== i; });
      stepperItems.forEach(function (li, li_i) {
        li.classList.toggle('is-current', li_i === i);
        li.classList.toggle('is-done', li_i < i);
      });
      btnPrev.hidden = i === 0;
      btnNext.hidden = i === steps.length - 1;
      btnSubmit.hidden = i !== steps.length - 1;
      if (i === steps.length - 1) { buildRecap(); }
      var card = devisForm.closest('.form-card');
      if (card && card.getBoundingClientRect().top < 0) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function buildRecap() {
      var solutions = chosenSolutions();
      var rows = [
        ['Solutions', solutions.length ? solutions.join(', ') : '—'],
        ['Secteur', $('#secteur').value || '—'],
        ['Effectif', $('#effectif').value || '—'],
        ['Ville', $('#ville').value || '—'],
        ['Sites', $('#sites').value || '1'],
        ['Fréquence', $('#frequence').value || '—'],
        ['Démarrage', $('#delai').value || '—']
      ];
      recap.innerHTML = '<strong style="font-family:var(--ff-title)">Récapitulatif de votre demande</strong>' +
        rows.map(function (r) {
          return '<div><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>';
        }).join('');
    }

    function validateStep(i) {
      var ok = validateScope(steps[i]);
      if (i === 0) {
        var hasSolution = chosenSolutions().length > 0;
        errSolutions.style.display = hasSolution ? 'none' : 'block';
        if (!hasSolution) { ok = false; }
      }
      return ok;
    }

    btnNext.addEventListener('click', function () {
      if (!validateStep(current)) {
        showStatus(devisForm, 'Merci de compléter les champs obligatoires de cette étape.', true);
        return;
      }
      var status = $('[data-status]', devisForm);
      if (status) { status.classList.remove('is-visible'); }
      showStep(Math.min(current + 1, steps.length - 1));
    });

    btnPrev.addEventListener('click', function () { showStep(Math.max(current - 1, 0)); });

    devisForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep(current)) {
        showStatus(devisForm, 'Merci de corriger les champs signalés en rouge.', true);
        return;
      }
      var nom = $('#nom').value.trim().split(' ')[0];
      var societe = $('#entreprise').value.trim();
      showStatus(devisForm,
        'Merci ' + nom + ' ! Votre demande pour ' + societe + ' a bien été enregistrée. ' +
        'Un conseiller vous appelle sous 24 h et votre devis vous parvient sous 48 h.', false);
      devisForm.reset();
      $$('.field.has-error', devisForm).forEach(function (f) { f.classList.remove('has-error'); });
      showStep(0);
      var status = $('[data-status]', devisForm);
      if (status) {
        status.classList.add('is-visible');
        status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    showStep(0);
  }

  /* ---------- Newsletter du pied de page ---------- */
  $$('[data-newsletter]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input[type="email"]', form);
      var status = form.parentElement.querySelector('[data-status]');
      var ok = RE_EMAIL.test((input.value || '').trim());
      if (status) {
        status.textContent = ok
          ? 'Merci ! Vous recevrez nos actualités hygiène & textile.'
          : 'Merci de saisir une adresse e-mail valide.';
        status.classList.add('is-visible');
        status.style.background = ok ? 'rgba(126,224,161,.12)' : 'rgba(255,120,100,.14)';
        status.style.borderColor = ok ? 'rgba(126,224,161,.4)' : 'rgba(255,120,100,.4)';
        status.style.color = ok ? '#7ee0a1' : '#ffb3a7';
      }
      if (ok) { form.reset(); }
    });
  });
})();
