(() => {
  const config = window.OAH_CONFIG;
  const cart = [];
  const $ = (selector) => document.querySelector(selector);

  const drawer = $("#cart-drawer");
  const backdrop = $("#modal-backdrop");
  const checkoutModal = $("#checkout-modal");
  const contactModal = $("#contact-modal");

  function money(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  }

  function openCart() {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function openModal(modal) {
    backdrop.hidden = false;
    checkoutModal.hidden = true;
    contactModal.hidden = true;
    modal.hidden = false;
  }

  function closeModal() {
    backdrop.hidden = true;
    checkoutModal.hidden = true;
    contactModal.hidden = true;
  }

  function renderCart() {
    const items = $("#cart-items");
    const count = $("#cart-count");
    const total = $("#cart-total");
    count.textContent = String(cart.length);

    if (!cart.length) {
      items.innerHTML = '<p style="color:var(--muted)">Your cart is empty.</p>';
      total.textContent = money(0);
      return;
    }

    items.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div><strong>${item.name}</strong><br><small>${item.billing}</small></div>
        <div><strong>${money(item.price)}</strong><br><button type="button" data-remove="${index}" style="background:none;border:0;color:var(--muted);cursor:pointer">Remove</button></div>
      </div>
    `).join("");

    total.textContent = money(cart.reduce((sum, item) => sum + item.price, 0));
    items.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        cart.splice(Number(button.dataset.remove), 1);
        renderCart();
      });
    });
  }

  async function loadProducts() {
    try {
      const response = await fetch(config.apiBaseUrl + config.endpoints.products, {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      const data = await response.json();
      const products = Array.isArray(data.products) ? data.products : [];

      products.forEach((product) => {
        const priceEl = document.querySelector(`[data-product-price="${product.slug}"]`);
        if (priceEl && Number.isFinite(product.price)) {
          priceEl.innerHTML = `${money(product.price)} <span>${product.billing_type === "yearly" ? "/ year" : "one time"}</span>`;
        }
      });
    } catch {
      // Static fallback prices remain visible if the API is unavailable.
    }
  }

  document.querySelectorAll(".add-product").forEach((button) => {
    button.addEventListener("click", () => {
      const product = button.dataset.product;
      const existing = cart.findIndex((item) => item.slug === product);
      if (existing >= 0) cart.splice(existing, 1);

      const data = product === "hosted"
        ? { slug: "hosted", name: "OneArtistHub Hosted", price: 4500, billing: "/ year" }
        : { slug: "self-hosted", name: "OneArtistHub Self-Hosted", price: 6500, billing: "one time" };

      cart.push(data);
      renderCart();
      openCart();
    });
  });

  $("#open-cart").addEventListener("click", openCart);
  $("#close-cart").addEventListener("click", closeCart);
  $("#contact-link").addEventListener("click", (event) => {
    event.preventDefault();
    openModal(contactModal);
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });

  $("#checkout-button").addEventListener("click", () => {
    if (!cart.length) return;
    closeCart();
    openModal(checkoutModal);
  });

  $("#checkout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#checkout-status");
    const form = new FormData(event.currentTarget);
    const item = cart[0];

    status.textContent = "Connecting to secure checkout…";

    try {
      const response = await fetch(config.apiBaseUrl + config.endpoints.checkout, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          product: item.slug,
          customer_name: form.get("customer_name"),
          customer_email: form.get("customer_email")
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Checkout could not be started.");

      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      status.textContent = "Checkout was created. The payment flow is ready for the Worker response.";
    } catch (error) {
      status.textContent = error.message;
    }
  });

  $("#contact-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#contact-status");
    const form = new FormData(event.currentTarget);
    status.textContent = "Sending…";

    try {
      const response = await fetch(config.apiBaseUrl + config.endpoints.contact, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Message could not be sent.");
      status.textContent = "Message sent. Thank you.";
      event.currentTarget.reset();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  renderCart();
  loadProducts();
})();
