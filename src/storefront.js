(() => {
  const config = window.OAH_CONFIG;
  const cart = [];
  let squareCard = null;
  let squarePayments = null;
  let squareConfig = null;
  let squareInitializing = null;

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

  async function loadSquareCard() {
    if (squareCard) return squareCard;
    if (squareInitializing) return squareInitializing;
    squareInitializing = (async () => {
      if (!window.Square) throw new Error("Secure payment service is still loading. Please try again.");
      const response = await fetch(config.apiBaseUrl + config.endpoints.squareConfig, {
        headers: { "Accept": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.application_id || !data.location_id) {
        throw new Error(data.error || "Secure payment checkout is not configured.");
      }
      squareConfig = data;
      squarePayments = window.Square.payments(data.application_id, data.location_id);
      squareCard = await squarePayments.card();
      await squareCard.attach("#card-container");
      return squareCard;
    })();
    try {
      return await squareInitializing;
    } finally {
      squareInitializing = null;
    }
  }

  async function prepareCheckout() {
    const item = cart[0];
    if (!item) return;
    const status = $("#checkout-status");
    status.textContent = "Loading secure card entry…";
    try {
      await loadSquareCard();
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
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
    prepareCheckout();
  });

  $("#checkout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#checkout-status");
    const payButton = $("#pay-button");
    const form = new FormData(event.currentTarget);
    const item = cart[0];
    if (!item) return;

    payButton.disabled = true;
    status.textContent = "Securing your payment…";

    try {
      const card = await loadSquareCard();
      const name = String(form.get("customer_name") || "").trim();
      const email = String(form.get("customer_email") || "").trim();
      const verificationDetails = {
        amount: (item.price / 100).toFixed(2),
        billingContact: { givenName: name, email },
        currencyCode: "USD",
        intent: item.slug === "hosted" ? "STORE" : "CHARGE",
        customerInitiated: true,
        sellerKeyedIn: false
      };
      const result = await card.tokenize(verificationDetails);
      if (result.status !== "OK" || !result.token) {
        const detail = Array.isArray(result.errors) && result.errors.length
          ? result.errors.map((error) => error.message || error.detail || "Card validation failed.").join(" ")
          : "Card validation failed. Please check your payment details.";
        throw new Error(detail);
      }

      status.textContent = item.slug === "hosted"
        ? "Creating your secure annual subscription…"
        : "Processing your secure payment…";

      const response = await fetch(config.apiBaseUrl + config.endpoints.payment, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          product: item.slug,
          customer_name: name,
          customer_email: email,
          source_id: result.token,
          verification_token: result.verificationToken || ""
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Payment could not be completed.");

      if (data.payment_status === "paid" || data.subscription_status === "active") {
        status.textContent = item.slug === "hosted"
          ? "Subscription active. Check your email for confirmation."
          : "Payment complete. Check your email for your OneArtistHub delivery.";
        cart.splice(0, 1);
        renderCart();
        event.currentTarget.reset();
        return;
      }

      status.textContent = "Your order was received and is being finalized. Check your email for confirmation.";
      cart.splice(0, 1);
      renderCart();
      event.currentTarget.reset();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      payButton.disabled = false;
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