/**
 * Ancrage - Theme JavaScript
 * Theme Shopify conversion-focused pour artisans, commerces et producteurs locaux.
 * Vanilla JS - ES6+ - Aucune dependance externe.
 *
 * (c) Atelier Scale
 */

/* ==========================================================================
   1. UTILITAIRES
   ========================================================================== */

/**
 * Formate un montant en centimes vers un prix en euros.
 * @param {number} cents - Montant en centimes.
 * @returns {string} Prix formate (ex. "12,50 EUR").
 */
function formatMoney(cents) {
  if (cents == null || isNaN(cents)) return '0,00 \u20AC';
  var amount = (cents / 100).toFixed(2).replace('.', ',');
  return amount + ' \u20AC';
}

/**
 * Debounce : retarde l'execution jusqu'a ce que l'utilisateur arrete d'agir.
 * @param {Function} fn
 * @param {number} delay - Delai en ms (defaut 300).
 * @returns {Function}
 */
function debounce(fn, delay) {
  if (delay === undefined) delay = 300;
  var timer;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

/**
 * Throttle : limite la frequence d'execution.
 * @param {Function} fn
 * @param {number} limit - Intervalle minimal en ms (defaut 200).
 * @returns {Function}
 */
function throttle(fn, limit) {
  if (limit === undefined) limit = 200;
  var waiting = false;
  return function () {
    if (waiting) return;
    var context = this;
    var args = arguments;
    fn.apply(context, args);
    waiting = true;
    setTimeout(function () {
      waiting = false;
    }, limit);
  };
}

/**
 * Retourne un objet de configuration fetch pour les appels Shopify Ajax API.
 * @param {string} type - "json" (defaut) ou "text".
 * @returns {Object}
 */
function fetchConfig(type) {
  if (type === undefined) type = 'json';
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/' + type
    }
  };
}

/**
 * Serialise un formulaire en objet cle/valeur.
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
function serializeForm(form) {
  var obj = {};
  var data = new FormData(form);
  data.forEach(function (value, key) {
    obj[key] = value;
  });
  return obj;
}

/* --------------------------------------------------------------------------
   Focus Trap
   -------------------------------------------------------------------------- */

var _focusTrapState = {
  container: null,
  firstFocusable: null,
  lastFocusable: null,
  handler: null
};

/**
 * Piege le focus clavier a l'interieur d'un conteneur (modale, drawer...).
 * @param {HTMLElement} container
 */
function trapFocus(container) {
  var focusableSelectors =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var focusableEls = container.querySelectorAll(focusableSelectors);
  if (focusableEls.length === 0) return;

  var first = focusableEls[0];
  var last = focusableEls[focusableEls.length - 1];

  _focusTrapState.container = container;
  _focusTrapState.firstFocusable = first;
  _focusTrapState.lastFocusable = last;

  _focusTrapState.handler = function (e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', _focusTrapState.handler);
  first.focus();
}

/**
 * Libere le piege de focus actif.
 */
function removeTrapFocus() {
  if (_focusTrapState.container && _focusTrapState.handler) {
    _focusTrapState.container.removeEventListener('keydown', _focusTrapState.handler);
  }
  _focusTrapState.container = null;
  _focusTrapState.firstFocusable = null;
  _focusTrapState.lastFocusable = null;
  _focusTrapState.handler = null;
}


/* ==========================================================================
   2. NAMESPACE PRINCIPAL
   ========================================================================== */

var Ancrage = {

  /** Cache de donnees (panier, produit courant, etc.) */
  cache: {
    cart: null,
    freeShippingThreshold: 4900 // 49,00 EUR en centimes - modifiable
  },

  /* -----------------------------------------------------------------------
     Initialisation globale
     ----------------------------------------------------------------------- */
  init: function () {
    this.Header.init();
    this.CartDrawer.init();
    this.Product.init();
    this.QuickView.init();
    this.Collection.init();
    this.ScrollAnimations.init();
    this.Newsletter.init();
    this.Countdown.init();
    this.BackToTop.init();
    this.AnnouncementBar.init();
    this.CookieBanner.init();
    this.LazyLoad.init();
    this.Accessibility.init();
  },


  /* ========================================================================
     3. HEADER
     ======================================================================== */
  Header: {
    _lastScrollY: 0,
    _ticking: false,

    init: function () {
      this.stickyHeader();
      this.mobileMenu();
      this.desktopDropdowns();
      this.searchDrawer();
    },

    /* -- Sticky header --------------------------------------------------- */
    stickyHeader: function () {
      var header = document.querySelector('.header');
      if (!header) return;

      var self = this;

      var onScroll = function () {
        self._lastScrollY = window.scrollY;
        if (!self._ticking) {
          requestAnimationFrame(function () {
            if (self._lastScrollY > 50) {
              header.classList.add('header--scrolled');
            } else {
              header.classList.remove('header--scrolled');
            }
            self._ticking = false;
          });
          self._ticking = true;
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
    },

    /* -- Menu mobile (drawer gauche) ------------------------------------- */
    mobileMenu: function () {
      var toggleBtn = document.querySelector('[data-mobile-menu-toggle]');
      var drawer = document.querySelector('.mobile-menu-drawer');
      var overlay = document.querySelector('.mobile-menu-overlay');
      var closeBtn = drawer ? drawer.querySelector('[data-mobile-menu-close]') : null;

      if (!toggleBtn || !drawer) return;

      var open = function () {
        drawer.classList.add('mobile-menu--open');
        document.body.classList.add('overflow-hidden');
        if (overlay) overlay.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
        trapFocus(drawer);
      };

      var close = function () {
        drawer.classList.remove('mobile-menu--open');
        document.body.classList.remove('overflow-hidden');
        if (overlay) overlay.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
        removeTrapFocus();
        toggleBtn.focus();
      };

      toggleBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (drawer.classList.contains('mobile-menu--open')) {
          close();
        } else {
          open();
        }
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      if (overlay) overlay.addEventListener('click', close);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('mobile-menu--open')) {
          close();
        }
      });
    },

    /* -- Dropdowns desktop (hover avec delai) ----------------------------- */
    desktopDropdowns: function () {
      var dropdowns = document.querySelectorAll('.nav-dropdown');
      if (!dropdowns.length) return;

      dropdowns.forEach(function (dropdown) {
        var timer = null;
        var trigger = dropdown.querySelector('.nav-dropdown__trigger');
        var menu = dropdown.querySelector('.nav-dropdown__menu');
        if (!trigger || !menu) return;

        var show = function () {
          clearTimeout(timer);
          // Fermer les autres
          dropdowns.forEach(function (d) {
            if (d !== dropdown) {
              d.classList.remove('nav-dropdown--open');
              var t = d.querySelector('.nav-dropdown__trigger');
              if (t) t.setAttribute('aria-expanded', 'false');
            }
          });
          dropdown.classList.add('nav-dropdown--open');
          trigger.setAttribute('aria-expanded', 'true');
        };

        var hide = function () {
          timer = setTimeout(function () {
            dropdown.classList.remove('nav-dropdown--open');
            trigger.setAttribute('aria-expanded', 'false');
          }, 250);
        };

        dropdown.addEventListener('mouseenter', show);
        dropdown.addEventListener('mouseleave', hide);

        // Support clavier
        trigger.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (dropdown.classList.contains('nav-dropdown--open')) {
              hide();
            } else {
              show();
            }
          }
        });

        // Fermer avec Echap
        dropdown.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && dropdown.classList.contains('nav-dropdown--open')) {
            dropdown.classList.remove('nav-dropdown--open');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
          }
        });
      });
    },

    /* -- Search drawer ---------------------------------------------------- */
    searchDrawer: function () {
      var openBtn = document.querySelector('[data-search-toggle]');
      var drawer = document.querySelector('.search-drawer');
      var closeBtn = drawer ? drawer.querySelector('[data-search-close]') : null;
      var overlay = drawer ? document.querySelector('.search-overlay') : null;

      if (!openBtn || !drawer) return;

      var open = function () {
        drawer.classList.add('search-drawer--open');
        document.body.classList.add('overflow-hidden');
        if (overlay) overlay.classList.add('active');
        trapFocus(drawer);
      };

      var close = function () {
        drawer.classList.remove('search-drawer--open');
        document.body.classList.remove('overflow-hidden');
        if (overlay) overlay.classList.remove('active');
        removeTrapFocus();
        openBtn.focus();
      };

      openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        open();
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      if (overlay) overlay.addEventListener('click', close);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('search-drawer--open')) {
          close();
        }
      });
    }
  },


  /* ========================================================================
     4. CART DRAWER
     ======================================================================== */
  CartDrawer: {
    _drawer: null,
    _overlay: null,

    init: function () {
      this._drawer = document.querySelector('.cart-drawer');
      this._overlay = document.querySelector('.cart-drawer-overlay');

      if (!this._drawer) return;

      this.bindOpen();
      this.bindClose();
      this.interceptAddToCart();
      this.bindQuantityAndRemove();
    },

    /* -- Ouvrir / Fermer -------------------------------------------------- */
    open: function () {
      var self = this;
      document.body.classList.add('cart-drawer--open');
      this._drawer.classList.add('active');
      if (this._overlay) this._overlay.classList.add('active');
      this.fetchAndRender().then(function () {
        trapFocus(self._drawer);
      });
    },

    close: function () {
      document.body.classList.remove('cart-drawer--open');
      this._drawer.classList.remove('active');
      if (this._overlay) this._overlay.classList.remove('active');
      removeTrapFocus();
    },

    bindOpen: function () {
      var self = this;
      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-cart-toggle]');
        if (trigger) {
          e.preventDefault();
          self.open();
        }
      });
    },

    bindClose: function () {
      var self = this;

      // Bouton fermer
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-cart-close]')) {
          e.preventDefault();
          self.close();
        }
      });

      // Overlay
      if (this._overlay) {
        this._overlay.addEventListener('click', function () {
          self.close();
        });
      }

      // Echap
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('cart-drawer--open')) {
          self.close();
        }
      });
    },

    /* -- Fetch panier ----------------------------------------------------- */
    fetchCart: function () {
      return fetch('/cart.js', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          Ancrage.cache.cart = cart;
          return cart;
        })
        .catch(function (err) {
          console.error('[Ancrage] Erreur fetch cart:', err);
          return null;
        });
    },

    /* -- Ajouter au panier ------------------------------------------------ */
    addToCart: function (formData) {
      var self = this;
      var config = fetchConfig('json');
      config.body = JSON.stringify(formData);

      return fetch('/cart/add.js', config)
        .then(function (r) {
          if (!r.ok) throw new Error('Erreur ajout panier');
          return r.json();
        })
        .then(function (item) {
          self.open();
          self.updateCartCount();
          return item;
        })
        .catch(function (err) {
          console.error('[Ancrage] Erreur add to cart:', err);
          return null;
        });
    },

    /* -- Intercepter les formulaires d'ajout ------------------------------ */
    interceptAddToCart: function () {
      var self = this;
      document.addEventListener('submit', function (e) {
        var form = e.target.closest('form[action*="/cart/add"]');
        if (!form) return;

        e.preventDefault();

        var formData = serializeForm(form);
        // S'assurer que la quantite est un nombre
        if (formData.quantity) formData.quantity = parseInt(formData.quantity, 10) || 1;

        self.addToCart(formData);
      });
    },

    /* -- Modifier la quantite --------------------------------------------- */
    changeQuantity: function (line, quantity) {
      var self = this;
      var config = fetchConfig('json');
      config.body = JSON.stringify({ line: line, quantity: quantity });

      return fetch('/cart/change.js', config)
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          Ancrage.cache.cart = cart;
          self.renderCart(cart);
          self.updateCartCount();
          return cart;
        })
        .catch(function (err) {
          console.error('[Ancrage] Erreur changement quantite:', err);
        });
    },

    /* -- Supprimer un article --------------------------------------------- */
    removeItem: function (line) {
      return this.changeQuantity(line, 0);
    },

    /* -- Delegation d'events quantite / suppression ----------------------- */
    bindQuantityAndRemove: function () {
      var self = this;

      document.addEventListener('click', function (e) {
        // Bouton + quantite
        var plus = e.target.closest('[data-cart-qty-plus]');
        if (plus) {
          e.preventDefault();
          var line = parseInt(plus.getAttribute('data-line'), 10);
          var input = plus.parentElement.querySelector('[data-cart-qty-input]');
          var currentQty = input ? parseInt(input.value, 10) : 1;
          self.changeQuantity(line, currentQty + 1);
          return;
        }

        // Bouton - quantite
        var minus = e.target.closest('[data-cart-qty-minus]');
        if (minus) {
          e.preventDefault();
          var lineM = parseInt(minus.getAttribute('data-line'), 10);
          var inputM = minus.parentElement.querySelector('[data-cart-qty-input]');
          var currentQtyM = inputM ? parseInt(inputM.value, 10) : 1;
          if (currentQtyM > 1) {
            self.changeQuantity(lineM, currentQtyM - 1);
          } else {
            self.removeItem(lineM);
          }
          return;
        }

        // Bouton supprimer
        var remove = e.target.closest('[data-cart-remove]');
        if (remove) {
          e.preventDefault();
          var lineR = parseInt(remove.getAttribute('data-line'), 10);
          self.removeItem(lineR);
        }
      });

      // Changement direct dans l'input quantite
      document.addEventListener('change', function (e) {
        var input = e.target.closest('[data-cart-qty-input]');
        if (!input) return;
        var line = parseInt(input.getAttribute('data-line'), 10);
        var qty = parseInt(input.value, 10);
        if (isNaN(qty) || qty < 0) qty = 0;
        self.changeQuantity(line, qty);
      });
    },

    /* -- Mettre a jour le compteur panier dans le header ------------------- */
    updateCartCount: function () {
      var cart = Ancrage.cache.cart;
      if (!cart) return;
      var badges = document.querySelectorAll('[data-cart-count]');
      badges.forEach(function (badge) {
        badge.textContent = cart.item_count;
        badge.hidden = cart.item_count === 0;
      });
    },

    /* -- Barre de livraison gratuite -------------------------------------- */
    renderFreeShippingBar: function (cart) {
      var bar = this._drawer ? this._drawer.querySelector('[data-free-shipping-bar]') : null;
      if (!bar) return;

      var threshold = Ancrage.cache.freeShippingThreshold;
      var total = cart.total_price;
      var remaining = threshold - total;
      var progress = Math.min((total / threshold) * 100, 100);

      var progressEl = bar.querySelector('[data-shipping-progress]');
      var messageEl = bar.querySelector('[data-shipping-message]');

      if (progressEl) progressEl.style.width = progress + '%';

      if (messageEl) {
        if (remaining <= 0) {
          messageEl.textContent = 'Livraison gratuite !';
          bar.classList.add('free-shipping--reached');
        } else {
          messageEl.textContent =
            'Plus que ' + formatMoney(remaining) + ' pour la livraison gratuite';
          bar.classList.remove('free-shipping--reached');
        }
      }
    },

    /* -- Fetch upsell produit --------------------------------------------- */
    fetchUpsell: function () {
      var upsellContainer = this._drawer
        ? this._drawer.querySelector('[data-cart-upsell]')
        : null;
      if (!upsellContainer) return;

      var handle = upsellContainer.getAttribute('data-upsell-handle');
      if (!handle) return;

      fetch('/products/' + handle + '.js', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (product) {
          if (!product || !product.available) {
            upsellContainer.style.display = 'none';
            return;
          }
          var titleEl = upsellContainer.querySelector('[data-upsell-title]');
          var priceEl = upsellContainer.querySelector('[data-upsell-price]');
          var imgEl = upsellContainer.querySelector('[data-upsell-image]');
          var btnEl = upsellContainer.querySelector('[data-upsell-add]');

          if (titleEl) titleEl.textContent = product.title;
          if (priceEl) priceEl.textContent = formatMoney(product.price);
          if (imgEl && product.featured_image) imgEl.src = product.featured_image;
          if (btnEl) btnEl.setAttribute('data-variant-id', product.variants[0].id);

          upsellContainer.style.display = '';
        })
        .catch(function (err) {
          console.error('[Ancrage] Erreur fetch upsell:', err);
          upsellContainer.style.display = 'none';
        });
    },

    /* -- Rendu HTML du drawer --------------------------------------------- */
    renderCart: function (cart) {
      var container = this._drawer
        ? this._drawer.querySelector('[data-cart-items]')
        : null;
      if (!container) return;

      if (!cart || cart.item_count === 0) {
        container.innerHTML =
          '<p class="cart-drawer__empty">Votre panier est vide.</p>';
        this.renderFreeShippingBar(cart || { total_price: 0 });
        return;
      }

      var html = '';

      cart.items.forEach(function (item, index) {
        var line = index + 1;
        var imgSrc = item.featured_image
          ? item.featured_image.url || item.featured_image
          : '';
        var variantTitle =
          item.variant_title && item.variant_title !== 'Default Title'
            ? item.variant_title
            : '';

        html +=
          '<div class="cart-item" data-cart-item data-line="' + line + '">' +
            '<div class="cart-item__image">' +
              (imgSrc
                ? '<img src="' + imgSrc + '" alt="' + item.title + '" loading="lazy" width="80" height="80">'
                : '') +
            '</div>' +
            '<div class="cart-item__details">' +
              '<a href="' + item.url + '" class="cart-item__title">' + item.title + '</a>' +
              (variantTitle
                ? '<p class="cart-item__variant">' + variantTitle + '</p>'
                : '') +
              '<p class="cart-item__price">' + formatMoney(item.final_line_price) + '</p>' +
              '<div class="cart-item__quantity">' +
                '<button type="button" class="qty-btn qty-btn--minus" data-cart-qty-minus data-line="' + line + '" aria-label="Diminuer la quantit\u00E9">-</button>' +
                '<input type="number" class="qty-input" data-cart-qty-input data-line="' + line + '" value="' + item.quantity + '" min="0" aria-label="Quantit\u00E9">' +
                '<button type="button" class="qty-btn qty-btn--plus" data-cart-qty-plus data-line="' + line + '" aria-label="Augmenter la quantit\u00E9">+</button>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="cart-item__remove" data-cart-remove data-line="' + line + '" aria-label="Supprimer ' + item.title + '">&times;</button>' +
          '</div>';
      });

      container.innerHTML = html;

      // Sous-total
      var subtotalEl = this._drawer
        ? this._drawer.querySelector('[data-cart-subtotal]')
        : null;
      if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);

      this.renderFreeShippingBar(cart);
      this.fetchUpsell();
    },

    /* -- Fetch + Render --------------------------------------------------- */
    fetchAndRender: function () {
      var self = this;
      return this.fetchCart().then(function (cart) {
        if (cart) {
          self.renderCart(cart);
          self.updateCartCount();
        }
      });
    }
  },


  /* ========================================================================
     5. PAGE PRODUIT
     ======================================================================== */
  Product: {
    _productData: null,
    _currentVariant: null,

    init: function () {
      this.loadProductData();
      this.imageGallery();
      this.variantSelector();
      this.quantityControls();
      this.stickyAddToCartBar();
      this.accordions();
    },

    /* -- Charger les donnees produit depuis le JSON inline ----------------- */
    loadProductData: function () {
      var el = document.querySelector('[data-product-json]');
      if (!el) return;
      try {
        this._productData = JSON.parse(el.textContent);
      } catch (err) {
        console.error('[Ancrage] Erreur parse product JSON:', err);
      }
    },

    /* -- Galerie d'images ------------------------------------------------- */
    imageGallery: function () {
      var mainImage = document.querySelector('[data-product-main-image]');
      var thumbnails = document.querySelectorAll('[data-product-thumbnail]');
      if (!mainImage || !thumbnails.length) return;

      thumbnails.forEach(function (thumb) {
        thumb.addEventListener('click', function (e) {
          e.preventDefault();
          var src = thumb.getAttribute('data-src') || thumb.src;
          var alt = thumb.getAttribute('alt') || '';

          mainImage.src = src;
          mainImage.alt = alt;

          // Classe active
          thumbnails.forEach(function (t) {
            t.classList.remove('thumbnail--active');
          });
          thumb.classList.add('thumbnail--active');
        });
      });
    },

    /* -- Selecteur de variante -------------------------------------------- */
    variantSelector: function () {
      var self = this;
      var selectors = document.querySelectorAll('[data-variant-select], [data-option-select]');
      if (!selectors.length || !this._productData) return;

      selectors.forEach(function (select) {
        select.addEventListener('change', function () {
          self.onVariantChange();
        });
      });

      // Boutons radio de variante
      var radioInputs = document.querySelectorAll('[data-variant-radio]');
      radioInputs.forEach(function (radio) {
        radio.addEventListener('change', function () {
          self.onVariantChange();
        });
      });
    },

    onVariantChange: function () {
      if (!this._productData) return;

      var selectedOptions = this.getSelectedOptions();
      var variant = this.findVariant(selectedOptions);

      if (!variant) return;

      this._currentVariant = variant;
      this.updatePrice(variant);
      this.updateImage(variant);
      this.updateAvailability(variant);
      this.updateURL(variant);
      this.updateVariantInput(variant);
    },

    getSelectedOptions: function () {
      var options = [];

      // Dropdowns
      var selects = document.querySelectorAll('[data-option-select]');
      if (selects.length) {
        selects.forEach(function (select) {
          options.push(select.value);
        });
        return options;
      }

      // Boutons radio
      var optionGroups = document.querySelectorAll('[data-option-group]');
      optionGroups.forEach(function (group) {
        var checked = group.querySelector('input[type="radio"]:checked');
        if (checked) options.push(checked.value);
      });

      return options;
    },

    findVariant: function (selectedOptions) {
      if (!this._productData || !this._productData.variants) return null;

      return this._productData.variants.find(function (variant) {
        return variant.options.every(function (option, index) {
          return option === selectedOptions[index];
        });
      }) || null;
    },

    updatePrice: function (variant) {
      var priceEl = document.querySelector('[data-product-price]');
      var comparePriceEl = document.querySelector('[data-product-compare-price]');

      if (priceEl) priceEl.textContent = formatMoney(variant.price);

      if (comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          comparePriceEl.textContent = formatMoney(variant.compare_at_price);
          comparePriceEl.style.display = '';
        } else {
          comparePriceEl.textContent = '';
          comparePriceEl.style.display = 'none';
        }
      }
    },

    updateImage: function (variant) {
      if (!variant.featured_image) return;
      var mainImage = document.querySelector('[data-product-main-image]');
      if (mainImage) {
        mainImage.src = variant.featured_image.src;
        mainImage.alt = variant.featured_image.alt || variant.title;
      }
    },

    updateAvailability: function (variant) {
      var addBtn = document.querySelector('[data-add-to-cart]');
      var addBtnText = addBtn ? addBtn.querySelector('[data-add-to-cart-text]') : null;

      if (!addBtn) return;

      if (variant.available) {
        addBtn.disabled = false;
        if (addBtnText) addBtnText.textContent = 'Ajouter au panier';
      } else {
        addBtn.disabled = true;
        if (addBtnText) addBtnText.textContent = '\u00C9puis\u00E9';
      }
    },

    updateURL: function (variant) {
      if (!variant || !history.replaceState) return;
      var url = window.location.pathname + '?variant=' + variant.id;
      history.replaceState({ path: url }, '', url);
    },

    updateVariantInput: function (variant) {
      var input = document.querySelector('input[name="id"][type="hidden"]');
      if (input) input.value = variant.id;
    },

    /* -- Controles quantite +/- ------------------------------------------ */
    quantityControls: function () {
      document.addEventListener('click', function (e) {
        var plus = e.target.closest('[data-qty-plus]');
        var minus = e.target.closest('[data-qty-minus]');
        var wrapper = (plus || minus) ? (plus || minus).closest('[data-qty-wrapper]') : null;
        if (!wrapper) return;

        e.preventDefault();
        var input = wrapper.querySelector('input[name="quantity"]');
        if (!input) return;

        var current = parseInt(input.value, 10) || 1;
        var min = parseInt(input.min, 10) || 1;
        var max = parseInt(input.max, 10) || 9999;

        if (plus) {
          input.value = Math.min(current + 1, max);
        } else if (minus) {
          input.value = Math.max(current - 1, min);
        }

        // Declencher un event change pour d'eventuels listeners
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    },

    /* -- Barre ATC sticky mobile ----------------------------------------- */
    stickyAddToCartBar: function () {
      var mainATC = document.querySelector('[data-add-to-cart]');
      var stickyBar = document.querySelector('[data-sticky-atc]');
      if (!mainATC || !stickyBar) return;

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              stickyBar.classList.remove('sticky-atc--visible');
            } else {
              stickyBar.classList.add('sticky-atc--visible');
            }
          });
        },
        { threshold: 0 }
      );

      observer.observe(mainATC);
    },

    /* -- Accordeons (description, livraison, retours) --------------------- */
    accordions: function () {
      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-accordion-trigger]');
        if (!trigger) return;

        e.preventDefault();
        var target = trigger.getAttribute('data-accordion-trigger');
        var panel = document.querySelector('[data-accordion-panel="' + target + '"]');
        if (!panel) return;

        var isOpen = trigger.getAttribute('aria-expanded') === 'true';

        trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        panel.hidden = isOpen;
        panel.classList.toggle('accordion--open', !isOpen);
      });
    }
  },


  /* ========================================================================
     6. QUICK VIEW PRODUIT
     ======================================================================== */
  QuickView: {
    _modal: null,

    init: function () {
      this._modal = document.querySelector('[data-quickview-modal]');
      if (!this._modal) return;

      this.bindOpen();
      this.bindClose();
    },

    bindOpen: function () {
      var self = this;
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-quickview]');
        if (!btn) return;

        e.preventDefault();
        var handle = btn.getAttribute('data-quickview');
        if (handle) self.fetchAndOpen(handle);
      });
    },

    bindClose: function () {
      var self = this;

      // Bouton fermer
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-quickview-close]')) {
          e.preventDefault();
          self.close();
        }
      });

      // Clic sur overlay
      if (this._modal) {
        this._modal.addEventListener('click', function (e) {
          if (e.target === self._modal) self.close();
        });
      }

      // Echap
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self._modal && self._modal.classList.contains('quickview--open')) {
          self.close();
        }
      });
    },

    fetchAndOpen: function (handle) {
      var self = this;
      var contentEl = this._modal
        ? this._modal.querySelector('[data-quickview-content]')
        : null;
      if (!contentEl) return;

      // Afficher un loader
      contentEl.innerHTML =
        '<div class="quickview__loader" aria-label="Chargement..."><span class="spinner"></span></div>';
      this.open();

      fetch('/products/' + handle + '.js', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) {
          if (!r.ok) throw new Error('Produit introuvable');
          return r.json();
        })
        .then(function (product) {
          self.renderProduct(product, contentEl);
        })
        .catch(function (err) {
          console.error('[Ancrage] Erreur Quick View:', err);
          contentEl.innerHTML =
            '<p class="quickview__error">Impossible de charger ce produit.</p>';
        });
    },

    renderProduct: function (product, container) {
      var variant = product.variants[0];
      var imgSrc = product.featured_image || '';
      var available = variant.available;
      var compareHtml = '';

      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareHtml =
          '<span class="quickview__compare-price">' +
          formatMoney(variant.compare_at_price) +
          '</span>';
      }

      var optionsHtml = '';
      if (product.variants.length > 1) {
        optionsHtml = '<select class="quickview__variant-select" data-quickview-variant>';
        product.variants.forEach(function (v) {
          optionsHtml +=
            '<option value="' + v.id + '"' +
            (!v.available ? ' disabled' : '') +
            (v.id === variant.id ? ' selected' : '') +
            '>' + v.title + '</option>';
        });
        optionsHtml += '</select>';
      }

      container.innerHTML =
        '<div class="quickview__inner">' +
          '<div class="quickview__image">' +
            (imgSrc
              ? '<img src="' + imgSrc + '" alt="' + product.title + '" loading="lazy">'
              : '') +
          '</div>' +
          '<div class="quickview__info">' +
            '<h2 class="quickview__title">' + product.title + '</h2>' +
            '<div class="quickview__pricing">' +
              '<span class="quickview__price">' + formatMoney(variant.price) + '</span>' +
              compareHtml +
            '</div>' +
            optionsHtml +
            '<form action="/cart/add" method="post" class="quickview__form">' +
              '<input type="hidden" name="id" value="' + variant.id + '">' +
              '<input type="hidden" name="quantity" value="1">' +
              '<button type="submit" class="quickview__add-btn btn btn--primary"' +
              (!available ? ' disabled' : '') +
              '>' +
              (available ? 'Ajouter au panier' : '\u00C9puis\u00E9') +
              '</button>' +
            '</form>' +
            '<a href="' + product.url + '" class="quickview__link">Voir le produit</a>' +
          '</div>' +
        '</div>';

      // Si plusieurs variantes, ecouter le changement
      var select = container.querySelector('[data-quickview-variant]');
      if (select) {
        select.addEventListener('change', function () {
          var selectedId = parseInt(select.value, 10);
          var selectedVariant = product.variants.find(function (v) {
            return v.id === selectedId;
          });
          if (!selectedVariant) return;

          var priceEl = container.querySelector('.quickview__price');
          var btn = container.querySelector('.quickview__add-btn');
          var hiddenId = container.querySelector('input[name="id"]');

          if (priceEl) priceEl.textContent = formatMoney(selectedVariant.price);
          if (hiddenId) hiddenId.value = selectedVariant.id;
          if (btn) {
            btn.disabled = !selectedVariant.available;
            btn.textContent = selectedVariant.available
              ? 'Ajouter au panier'
              : '\u00C9puis\u00E9';
          }
        });
      }
    },

    open: function () {
      if (!this._modal) return;
      this._modal.classList.add('quickview--open');
      document.body.classList.add('overflow-hidden');
      trapFocus(this._modal);
    },

    close: function () {
      if (!this._modal) return;
      this._modal.classList.remove('quickview--open');
      document.body.classList.remove('overflow-hidden');
      removeTrapFocus();
    }
  },


  /* ========================================================================
     7. PAGE COLLECTION
     ======================================================================== */
  Collection: {
    init: function () {
      this.filterToggle();
      this.sortBy();
      this.loadMore();
    },

    /* -- Filtre mobile toggle --------------------------------------------- */
    filterToggle: function () {
      var toggleBtn = document.querySelector('[data-filter-toggle]');
      var panel = document.querySelector('[data-filter-panel]');
      if (!toggleBtn || !panel) return;

      toggleBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = panel.classList.toggle('filter-panel--open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    },

    /* -- Tri par ---------------------------------------------------------- */
    sortBy: function () {
      var select = document.querySelector('[data-sort-by]');
      if (!select) return;

      // Pre-selectionner la valeur actuelle
      var params = new URLSearchParams(window.location.search);
      var current = params.get('sort_by');
      if (current) select.value = current;

      select.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', select.value);
        window.location.href = url.toString();
      });
    },

    /* -- Load more / Infinite scroll -------------------------------------- */
    loadMore: function () {
      var loadMoreBtn = document.querySelector('[data-load-more]');
      var grid = document.querySelector('[data-product-grid]');

      if (!grid) return;

      // Option 1 : bouton "Charger plus"
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var nextUrl = loadMoreBtn.getAttribute('data-next-url');
          if (!nextUrl) return;

          loadMoreBtn.disabled = true;
          loadMoreBtn.textContent = 'Chargement...';

          fetch(nextUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/html' }
          })
            .then(function (r) { return r.text(); })
            .then(function (html) {
              var parser = new DOMParser();
              var doc = parser.parseFromString(html, 'text/html');
              var newItems = doc.querySelectorAll('[data-product-grid] > *');
              var newLoadMore = doc.querySelector('[data-load-more]');

              newItems.forEach(function (item) {
                grid.appendChild(item);
              });

              // Mettre a jour le bouton
              if (newLoadMore) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Charger plus';
                loadMoreBtn.setAttribute('data-next-url', newLoadMore.getAttribute('data-next-url'));
              } else {
                loadMoreBtn.remove();
              }

              // Re-initialiser les animations sur les nouveaux elements
              Ancrage.ScrollAnimations.observe();
            })
            .catch(function (err) {
              console.error('[Ancrage] Erreur chargement:', err);
              loadMoreBtn.disabled = false;
              loadMoreBtn.textContent = 'Charger plus';
            });
        });
      }

      // Option 2 : scroll infini
      var infiniteSentinel = document.querySelector('[data-infinite-scroll]');
      if (infiniteSentinel && !loadMoreBtn) {
        var loading = false;

        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting || loading) return;
              var nextUrl = infiniteSentinel.getAttribute('data-next-url');
              if (!nextUrl) {
                observer.disconnect();
                return;
              }

              loading = true;

              fetch(nextUrl, {
                method: 'GET',
                headers: { 'Accept': 'text/html' }
              })
                .then(function (r) { return r.text(); })
                .then(function (html) {
                  var parser = new DOMParser();
                  var doc = parser.parseFromString(html, 'text/html');
                  var newItems = doc.querySelectorAll('[data-product-grid] > *');
                  var newSentinel = doc.querySelector('[data-infinite-scroll]');

                  newItems.forEach(function (item) {
                    grid.appendChild(item);
                  });

                  if (newSentinel) {
                    infiniteSentinel.setAttribute(
                      'data-next-url',
                      newSentinel.getAttribute('data-next-url')
                    );
                  } else {
                    infiniteSentinel.remove();
                    observer.disconnect();
                  }

                  loading = false;
                  Ancrage.ScrollAnimations.observe();
                })
                .catch(function (err) {
                  console.error('[Ancrage] Erreur infinite scroll:', err);
                  loading = false;
                });
            });
          },
          { rootMargin: '200px' }
        );

        observer.observe(infiniteSentinel);
      }
    }
  },


  /* ========================================================================
     8. ANIMATIONS AU SCROLL
     ======================================================================== */
  ScrollAnimations: {
    _observer: null,

    init: function () {
      if (!('IntersectionObserver' in window)) {
        // Fallback : rendre tout visible immediatement
        document.querySelectorAll('[data-aos]').forEach(function (el) {
          el.classList.add('aos-animate');
        });
        return;
      }

      this._observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var el = entry.target;
              var delay = parseInt(el.getAttribute('data-aos-delay'), 10) || 0;

              if (delay > 0) {
                setTimeout(function () {
                  el.classList.add('aos-animate');
                }, delay);
              } else {
                el.classList.add('aos-animate');
              }
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      this.observe();
    },

    /** Observe (ou re-observe) tous les elements [data-aos] non animes. */
    observe: function () {
      if (!this._observer) return;
      var els = document.querySelectorAll('[data-aos]:not(.aos-animate)');
      var obs = this._observer;
      els.forEach(function (el) {
        obs.observe(el);
      });
    }
  },


  /* ========================================================================
     9. FORMULAIRE NEWSLETTER
     ======================================================================== */
  Newsletter: {
    init: function () {
      var forms = document.querySelectorAll('[data-newsletter-form]');
      if (!forms.length) return;

      forms.forEach(function (form) {
        form.addEventListener('submit', function (e) {
          var emailInput = form.querySelector('input[type="email"]');
          var msgEl = form.querySelector('[data-newsletter-message]');

          // Validation email
          if (emailInput && !Ancrage.Newsletter.isValidEmail(emailInput.value)) {
            e.preventDefault();
            if (msgEl) {
              msgEl.textContent = 'Veuillez entrer une adresse email valide.';
              msgEl.className = 'newsletter__message newsletter__message--error';
              msgEl.hidden = false;
            }
            emailInput.focus();
            return;
          }

          // Si le formulaire pointe vers un endpoint Shopify (/contact),
          // on laisse le navigateur soumettre normalement.
          // Pour un affichage ajax, on intercepte ici.
          if (form.getAttribute('data-newsletter-ajax') !== null) {
            e.preventDefault();

            var formData = new FormData(form);

            fetch(form.action, {
              method: 'POST',
              body: formData,
              headers: { 'Accept': 'application/json' }
            })
              .then(function (r) {
                if (r.ok || r.status === 302 || r.status === 200) {
                  if (msgEl) {
                    msgEl.textContent = 'Merci pour votre inscription !';
                    msgEl.className = 'newsletter__message newsletter__message--success';
                    msgEl.hidden = false;
                  }
                  form.reset();
                } else {
                  throw new Error('Erreur serveur');
                }
              })
              .catch(function () {
                if (msgEl) {
                  msgEl.textContent = 'Une erreur est survenue. Veuillez r\u00E9essayer.';
                  msgEl.className = 'newsletter__message newsletter__message--error';
                  msgEl.hidden = false;
                }
              });
          }
        });
      });
    },

    isValidEmail: function (email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }
  },


  /* ========================================================================
     10. COMPTE A REBOURS
     ======================================================================== */
  Countdown: {
    init: function () {
      var elements = document.querySelectorAll('[data-countdown]');
      if (!elements.length) return;

      elements.forEach(function (el) {
        var target = el.getAttribute('data-countdown');
        var endDate = new Date(target).getTime();

        if (isNaN(endDate)) {
          el.textContent = 'Date invalide';
          return;
        }

        var tick = function () {
          var now = Date.now();
          var diff = endDate - now;

          if (diff <= 0) {
            el.innerHTML = '<span class="countdown__expired">Offre expir\u00E9e</span>';
            return;
          }

          var days = Math.floor(diff / (1000 * 60 * 60 * 24));
          var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          var seconds = Math.floor((diff % (1000 * 60)) / 1000);

          el.innerHTML =
            '<span class="countdown__block"><span class="countdown__number">' + days + '</span><span class="countdown__label">j</span></span>' +
            '<span class="countdown__separator">:</span>' +
            '<span class="countdown__block"><span class="countdown__number">' + String(hours).padStart(2, '0') + '</span><span class="countdown__label">h</span></span>' +
            '<span class="countdown__separator">:</span>' +
            '<span class="countdown__block"><span class="countdown__number">' + String(minutes).padStart(2, '0') + '</span><span class="countdown__label">min</span></span>' +
            '<span class="countdown__separator">:</span>' +
            '<span class="countdown__block"><span class="countdown__number">' + String(seconds).padStart(2, '0') + '</span><span class="countdown__label">s</span></span>';

          setTimeout(tick, 1000);
        };

        tick();
      });
    }
  },


  /* ========================================================================
     11. BOUTON RETOUR EN HAUT
     ======================================================================== */
  BackToTop: {
    init: function () {
      var btn = document.querySelector('[data-back-to-top]');
      if (!btn) return;

      // Afficher/masquer
      window.addEventListener(
        'scroll',
        throttle(function () {
          if (window.scrollY > 600) {
            btn.classList.add('back-to-top--visible');
            btn.setAttribute('aria-hidden', 'false');
          } else {
            btn.classList.remove('back-to-top--visible');
            btn.setAttribute('aria-hidden', 'true');
          }
        }, 200),
        { passive: true }
      );

      // Scroll smooth
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  },


  /* ========================================================================
     12. BARRE D'ANNONCE
     ======================================================================== */
  AnnouncementBar: {
    _interval: null,

    init: function () {
      var bar = document.querySelector('[data-announcement-bar]');
      if (!bar) return;

      this.dismissible(bar);
      this.autoRotate(bar);
    },

    /* -- Fermeture (sessionStorage) --------------------------------------- */
    dismissible: function (bar) {
      // Verifier si deja fermee
      if (sessionStorage.getItem('ancrage_announcement_dismissed') === 'true') {
        bar.style.display = 'none';
        return;
      }

      var closeBtn = bar.querySelector('[data-announcement-close]');
      if (!closeBtn) return;

      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        bar.style.display = 'none';
        sessionStorage.setItem('ancrage_announcement_dismissed', 'true');
        if (Ancrage.AnnouncementBar._interval) {
          clearInterval(Ancrage.AnnouncementBar._interval);
        }
      });
    },

    /* -- Rotation automatique des messages -------------------------------- */
    autoRotate: function (bar) {
      var messages = bar.querySelectorAll('[data-announcement-message]');
      if (messages.length <= 1) return;

      var current = 0;
      messages.forEach(function (msg, i) {
        msg.style.display = i === 0 ? '' : 'none';
      });

      this._interval = setInterval(function () {
        messages[current].style.display = 'none';
        current = (current + 1) % messages.length;
        messages[current].style.display = '';
      }, 5000);
    }
  },


  /* ========================================================================
     13. BANDEAU COOKIES / RGPD
     ======================================================================== */
  CookieBanner: {
    init: function () {
      var banner = document.querySelector('[data-cookie-banner]');
      if (!banner) return;

      // Deja accepte ou refuse ?
      var consent = localStorage.getItem('ancrage_cookie_consent');
      if (consent !== null) {
        banner.style.display = 'none';
        return;
      }

      // Afficher le bandeau
      banner.style.display = '';
      banner.removeAttribute('hidden');

      var acceptBtn = banner.querySelector('[data-cookie-accept]');
      var declineBtn = banner.querySelector('[data-cookie-decline]');

      if (acceptBtn) {
        acceptBtn.addEventListener('click', function (e) {
          e.preventDefault();
          localStorage.setItem('ancrage_cookie_consent', 'accepted');
          banner.style.display = 'none';
        });
      }

      if (declineBtn) {
        declineBtn.addEventListener('click', function (e) {
          e.preventDefault();
          localStorage.setItem('ancrage_cookie_consent', 'declined');
          banner.style.display = 'none';
        });
      }
    }
  },


  /* ========================================================================
     14. LAZY LOADING (FALLBACK)
     ======================================================================== */
  LazyLoad: {
    init: function () {
      // Si le navigateur supporte loading="lazy" nativement, rien a faire.
      if ('loading' in HTMLImageElement.prototype) return;

      // Fallback IntersectionObserver pour les navigateurs plus anciens
      if (!('IntersectionObserver' in window)) {
        // Dernier recours : tout charger
        document.querySelectorAll('img[data-src]').forEach(function (img) {
          img.src = img.getAttribute('data-src');
        });
        return;
      }

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            var img = entry.target;
            var src = img.getAttribute('data-src');
            var srcset = img.getAttribute('data-srcset');

            if (src) img.src = src;
            if (srcset) img.srcset = srcset;

            img.removeAttribute('data-src');
            img.removeAttribute('data-srcset');
            observer.unobserve(img);
          });
        },
        { rootMargin: '300px' }
      );

      document.querySelectorAll('img[data-src]').forEach(function (img) {
        observer.observe(img);
      });
    }
  },


  /* ========================================================================
     15. ACCESSIBILITE
     ======================================================================== */
  Accessibility: {
    init: function () {
      this.skipToContent();
      this.keyboardDropdowns();
      this.ariaToggles();
    },

    /* -- Skip to content -------------------------------------------------- */
    skipToContent: function () {
      var skipLink = document.querySelector('[data-skip-to-content]');
      if (!skipLink) return;

      skipLink.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = skipLink.getAttribute('href');
        var target = document.querySelector(targetId);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.addEventListener(
            'blur',
            function () {
              target.removeAttribute('tabindex');
            },
            { once: true }
          );
        }
      });
    },

    /* -- Navigation clavier pour dropdowns -------------------------------- */
    keyboardDropdowns: function () {
      document.addEventListener('keydown', function (e) {
        // Fermer tout dropdown ouvert avec Echap (sauf ceux geres ailleurs)
        if (e.key === 'Escape') {
          var openDropdowns = document.querySelectorAll('.nav-dropdown--open');
          openDropdowns.forEach(function (dd) {
            dd.classList.remove('nav-dropdown--open');
            var trigger = dd.querySelector('.nav-dropdown__trigger');
            if (trigger) {
              trigger.setAttribute('aria-expanded', 'false');
              trigger.focus();
            }
          });
        }

        // Fleches haut/bas dans un menu ouvert
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          var openMenu = document.querySelector('.nav-dropdown--open .nav-dropdown__menu');
          if (!openMenu) return;

          var links = openMenu.querySelectorAll('a, button');
          if (!links.length) return;

          e.preventDefault();
          var idx = Array.prototype.indexOf.call(links, document.activeElement);

          if (e.key === 'ArrowDown') {
            idx = idx < links.length - 1 ? idx + 1 : 0;
          } else {
            idx = idx > 0 ? idx - 1 : links.length - 1;
          }

          links[idx].focus();
        }
      });
    },

    /* -- Gestion ARIA pour les toggles generiques ------------------------- */
    ariaToggles: function () {
      document.addEventListener('click', function (e) {
        var toggle = e.target.closest('[data-aria-toggle]');
        if (!toggle) return;

        e.preventDefault();
        var targetSelector = toggle.getAttribute('data-aria-toggle');
        var target = document.querySelector(targetSelector);
        if (!target) return;

        var isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        target.hidden = isExpanded;
      });
    }
  }
};


/* ==========================================================================
   LANCEMENT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  Ancrage.init();
});
