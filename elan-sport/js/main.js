/* =========================================================
   ELAN SPORT — Script principal (partagé par toutes les pages)
   ========================================================= */

(function () {
  "use strict";

  const CART_KEY = "elan_cart_v1";
  const THEME_KEY = "elan_theme";

  /* ---------------- Utilitaires ---------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatPrice = (n) => n.toFixed(2).replace(".", ",") + " €";
  const productById = (id) => PRODUCTS.find((p) => p.id === id);

  /* ---------------- Thème clair / sombre ---------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $$(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        const next = current === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem(THEME_KEY, next);
      });
    });
  }

  /* ---------------- Header (scroll + menu mobile) ---------------- */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = $(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = header.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      $$(".main-nav a").forEach((a) => a.addEventListener("click", () => header.classList.remove("nav-open")));
    }

    // Marque le lien actif selon la page courante
    const path = location.pathname.split("/").pop() || "index.html";
    $$(".main-nav a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) a.classList.add("is-active");
    });
  }

  /* ---------------- Panier ---------------- */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch { return {}; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function addToCart(id, qty = 1) {
    const cart = getCart();
    cart[id] = (cart[id] || 0) + qty;
    saveCart(cart);
    renderCartDrawer();
    updateCartBadge();
    const p = productById(id);
    if (p) showToast(`${p.name} ajouté au panier`);
  }
  function setQty(id, qty) {
    const cart = getCart();
    if (qty <= 0) delete cart[id]; else cart[id] = qty;
    saveCart(cart);
    renderCartDrawer();
    updateCartBadge();
  }
  function removeFromCart(id) { setQty(id, 0); }

  function cartCount() { return Object.values(getCart()).reduce((a, b) => a + b, 0); }
  function cartTotal() {
    const cart = getCart();
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = productById(id);
      return p ? sum + p.price * qty : sum;
    }, 0);
  }

  function updateCartBadge() {
    $$(".cart-count").forEach((el) => {
      const n = cartCount();
      el.textContent = n;
      el.classList.toggle("is-visible", n > 0);
    });
  }

  function renderCartDrawer() {
    const list = $("#cart-items");
    if (!list) return;
    const cart = getCart();
    const entries = Object.entries(cart);

    if (entries.length === 0) {
      list.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
          Votre panier est vide pour le moment.
        </div>`;
    } else {
      list.innerHTML = entries.map(([id, qty]) => {
        const p = productById(id);
        if (!p) return "";
        return `
        <div class="cart-row" data-id="${id}">
          <div class="cart-thumb" style="background:linear-gradient(150deg, ${p.colors[0]}, ${p.colors[1]})">
            ${garmentSVG(p.icon)}
          </div>
          <div class="cart-row-info">
            <p class="cat">${CATEGORY_LABELS[p.category]}</p>
            <h5>${p.name}</h5>
            <div class="cart-row-bottom">
              <div class="qty-ctrl">
                <button type="button" data-action="dec" aria-label="Diminuer la quantité">−</button>
                <span>${qty}</span>
                <button type="button" data-action="inc" aria-label="Augmenter la quantité">+</button>
              </div>
              <span class="cart-row-price">${formatPrice(p.price * qty)}</span>
            </div>
            <a href="#" class="remove-btn" data-action="remove">Retirer</a>
          </div>
        </div>`;
      }).join("");
    }

    const subtotal = $("#cart-subtotal");
    if (subtotal) subtotal.textContent = formatPrice(cartTotal());
    const checkoutBtn = $("#cart-checkout");
    if (checkoutBtn) checkoutBtn.disabled = entries.length === 0;
  }

  function initCart() {
    updateCartBadge();
    renderCartDrawer();

    const drawer = $("#cart-drawer");
    const overlay = $("#cart-overlay");
    const openBtn = $("#cart-open");
    const closeBtn = $("#cart-close");

    const open = () => { drawer?.classList.add("is-open"); overlay?.classList.add("is-open"); document.body.style.overflow = "hidden"; };
    const close = () => { drawer?.classList.remove("is-open"); overlay?.classList.remove("is-open"); document.body.style.overflow = ""; };

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    overlay?.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    $("#cart-items")?.addEventListener("click", (e) => {
      const row = e.target.closest(".cart-row");
      if (!row) return;
      const id = row.dataset.id;
      const cart = getCart();
      if (e.target.closest('[data-action="inc"]')) setQty(id, (cart[id] || 0) + 1);
      if (e.target.closest('[data-action="dec"]')) setQty(id, (cart[id] || 0) - 1);
      if (e.target.closest('[data-action="remove"]')) { e.preventDefault(); removeFromCart(id); }
    });

    $("#cart-checkout")?.addEventListener("click", () => {
      if (cartCount() === 0) return;
      showToast("Commande simulée — merci pour votre confiance !");
      saveCart({});
      renderCartDrawer();
      updateCartBadge();
      close();
    });

    // Délégation globale pour tous les boutons "ajouter au panier" / "quick add"
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-id]");
      if (!btn) return;
      e.preventDefault();
      addToCart(btn.dataset.addId, 1);
    });
  }

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function showToast(message) {
    let toast = $("#toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg><span></span>`;
      document.body.appendChild(toast);
    }
    $("span", toast).textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  /* ---------------- Rendu des cartes produit ---------------- */
  function productCardHTML(p) {
    const tagHTML = p.tag ? `<span class="tag ${p.tag === "Promo" ? "tag--red" : p.tag === "Nouveau" ? "tag--blue" : "tag--accent"}">${p.tag}</span>` : "";
    const oldHTML = p.oldPrice ? `<span class="old">${formatPrice(p.oldPrice)}</span>` : "";
    return `
    <article class="product-card reveal">
      <div class="product-thumb" style="background:linear-gradient(150deg, ${p.colors[0]}, ${p.colors[1]})">
        ${tagHTML}
        ${garmentSVG(p.icon)}
        <button type="button" class="quick-add" data-add-id="${p.id}" aria-label="Ajout rapide au panier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="product-info">
        <span class="cat">${CATEGORY_LABELS[p.category]}</span>
        <h4>${p.name}</h4>
        <div class="product-price">
          <strong>${formatPrice(p.price)}</strong>
          ${oldHTML}
        </div>
      </div>
    </article>`;
  }

  function initBestsellers() {
    const grid = $("#bestsellers-grid");
    if (!grid) return;
    const selection = PRODUCTS.slice(0, 8);
    grid.innerHTML = selection.map(productCardHTML).join("");
    observeReveal();
  }

  /* ---------------- Boutique : filtres + tri ---------------- */
  function initShopGrid() {
    const grid = $("#shop-grid");
    if (!grid) return;

    const state = { categories: new Set(), maxPrice: 120, sort: "popular" };
    const countEl = $("#result-count");
    const priceOutput = $("#price-output");
    const priceInput = $("#price-range");

    function apply() {
      let list = PRODUCTS.filter((p) => {
        const catOk = state.categories.size === 0 || state.categories.has(p.category);
        const priceOk = p.price <= state.maxPrice;
        return catOk && priceOk;
      });

      if (state.sort === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
      else if (state.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
      else if (state.sort === "new") list = list.slice().sort((a, b) => (b.tag === "Nouveau") - (a.tag === "Nouveau"));

      grid.innerHTML = list.length
        ? list.map(productCardHTML).join("")
        : `<p class="no-results">Aucun produit ne correspond à votre sélection. Essayez d'élargir vos filtres.</p>`;

      if (countEl) countEl.textContent = `${list.length} produit${list.length > 1 ? "s" : ""}`;
      observeReveal();
    }

    $$('.filter-option input[name="category"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        if (cb.checked) state.categories.add(cb.value); else state.categories.delete(cb.value);
        apply();
      });
    });

    // Pré-sélection depuis l'URL (ex : boutique.html?cat=running)
    const urlCat = new URLSearchParams(location.search).get("cat");
    if (urlCat && CATEGORY_LABELS[urlCat]) {
      state.categories.add(urlCat);
      const cb = $(`.filter-option input[name="category"][value="${urlCat}"]`);
      if (cb) cb.checked = true;
    }

    if (priceInput) {
      priceInput.addEventListener("input", () => {
        state.maxPrice = Number(priceInput.value);
        if (priceOutput) priceOutput.textContent = formatPrice(state.maxPrice);
        apply();
      });
    }

    $("#sort-select")?.addEventListener("change", (e) => { state.sort = e.target.value; apply(); });

    $("#clear-filters")?.addEventListener("click", () => {
      state.categories.clear();
      state.maxPrice = 120;
      state.sort = "popular";
      $$('.filter-option input[name="category"]').forEach((cb) => (cb.checked = false));
      if (priceInput) priceInput.value = 120;
      if (priceOutput) priceOutput.textContent = formatPrice(120);
      const sortSelect = $("#sort-select");
      if (sortSelect) sortSelect.value = "popular";
      apply();
    });

    apply();
  }

  /* ---------------- Galerie (index) ---------------- */
  function initGallery() {
    const grid = $("#gallery-grid");
    if (!grid) return;
    const handles = ["@elan.run", "@team_elan", "@elansport", "@elan.fit", "@elan.style", "@elan.yoga"];
    const picks = [PRODUCTS[9], PRODUCTS[0], PRODUCTS[5], PRODUCTS[2], PRODUCTS[10], PRODUCTS[7]];
    grid.innerHTML = picks.map((p, i) => `
      <div class="gallery-item reveal" style="background:linear-gradient(160deg, ${p.colors[0]}, ${p.colors[1]})">
        ${garmentSVG(p.icon)}
        <span class="handle">${handles[i]}</span>
      </div>`).join("");
    observeReveal();
  }

  /* ---------------- Témoignages ---------------- */
  function initTestimonials() {
    const wrap = $("#testi-wrap");
    if (!wrap) return;
    const slides = $$(".testi-slide", wrap);
    const dotsWrap = $("#testi-dots");
    let index = 0, timer;

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle("is-active", n === index));
      $$("button", dotsWrap).forEach((d, n) => d.classList.toggle("is-active", n === index));
    }
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Témoignage ${i + 1}`);
      dot.addEventListener("click", () => { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });
    $("#testi-prev")?.addEventListener("click", () => { go(index - 1); restart(); });
    $("#testi-next")?.addEventListener("click", () => { go(index + 1); restart(); });

    function restart() { clearInterval(timer); timer = setInterval(() => go(index + 1), 6000); }
    go(0); restart();
  }

  /* ---------------- FAQ accordéon (contact) ---------------- */
  function initFAQ() {
    $$(".faq-item").forEach((item) => {
      const q = $(".faq-q", item);
      const a = $(".faq-a", item);
      q.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        $$(".faq-item").forEach((i) => { i.classList.remove("is-open"); $(".faq-a", i).style.maxHeight = null; });
        if (!isOpen) { item.classList.add("is-open"); a.style.maxHeight = a.scrollHeight + "px"; }
      });
    });
  }

  /* ---------------- Formulaire newsletter ---------------- */
  function initNewsletter() {
    const form = $("#newsletter-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input", form);
      const msg = $("#newsletter-msg");
      const value = input.value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!ok) {
        msg.textContent = "Merci de renseigner une adresse e-mail valide.";
        msg.classList.add("is-error");
        return;
      }
      msg.classList.remove("is-error");
      msg.textContent = "Merci ! Vérifiez votre boîte mail pour confirmer votre inscription.";
      form.reset();
    });
  }

  /* ---------------- Formulaire de contact ---------------- */
  function initContactForm() {
    const form = $("#contact-form");
    if (!form) return;
    const successBox = $("#contact-success");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      $$(".field", form).forEach((field) => {
        const input = $("input, textarea", field);
        if (!input) return;
        let fieldValid = input.value.trim().length > 0;
        if (input.type === "email" && fieldValid) fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        field.classList.toggle("has-error", !fieldValid);
        if (!fieldValid) valid = false;
      });

      if (!valid) return;

      form.hidden = true;
      if (successBox) successBox.hidden = false;
    });
  }

  /* ---------------- Animation au scroll ----------------
     Vérification directe (plutôt qu'un simple IntersectionObserver) afin que
     les éléments soient bien révélés même après un saut de scroll instantané
     (ancre, navigateur sans rendu intermédiaire, etc.). */
  let revealTicking = false;
  function revealVisibleNow() {
    const vh = window.innerHeight;
    $$(".reveal:not(.is-visible)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 1.1 && r.bottom > -200) el.classList.add("is-visible");
    });
    revealTicking = false;
  }
  function observeReveal() {
    revealVisibleNow();
  }
  function initRevealListeners() {
    const onScroll = () => {
      if (revealTicking) return;
      revealTicking = true;
      requestAnimationFrame(revealVisibleNow);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------------- Année dans le footer ---------------- */
  function initYear() {
    $$(".current-year").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initHeader();
    initCart();
    initBestsellers();
    initShopGrid();
    initGallery();
    initTestimonials();
    initFAQ();
    initNewsletter();
    initContactForm();
    initYear();
    initRevealListeners();
    observeReveal();
  });
})();
