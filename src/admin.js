(() => {
  const config = window.OAH_CONFIG;
  const $ = (selector) => document.querySelector(selector);

  async function request(path, options = {}) {
    const response = await fetch(config.apiBaseUrl + path, {
      credentials: "include",
      ...options,
      headers: {
        "Accept": "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function loadOrders() {
    const data = await request(config.endpoints.adminOrders);
    const orders = Array.isArray(data.orders) ? data.orders : [];
    $("#stat-orders").textContent = String(orders.length);
    $("#stat-revenue").textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((data.revenue_cents || 0) / 100);
    $("#stat-hosted").textContent = String(data.hosted_count || 0);

    $("#orders").innerHTML = orders.length
      ? orders.map((order) => `
        <article class="feature-grid" style="display:grid;grid-template-columns:1fr;margin:10px 0;padding:20px;border:1px solid var(--border);border-radius:18px">
          <div><strong>${escapeHtml(order.customer_name || "")}</strong><br><small>${escapeHtml(order.customer_email || "")}</small></div>
          <div>${escapeHtml(order.product_name || order.product_id || "")}</div>
          <div>${escapeHtml(order.product_version || "")}</div>
          <div>${escapeHtml(order.payment_status || "")}</div>
          <div>${escapeHtml(order.created_at || "")}</div>
        </article>`).join("")
      : "<p style='color:var(--muted)'>No orders yet.</p>";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char]);
  }

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#login-status");
    const form = new FormData(event.currentTarget);
    status.textContent = "Signing in…";

    try {
      await request(config.endpoints.adminLogin, {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });
      $("#admin-login").hidden = true;
      $("#admin-app").hidden = false;
      await loadOrders();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  $("#logout").addEventListener("click", async () => {
    try { await request(config.endpoints.adminLogout, { method: "POST" }); } finally {
      window.location.reload();
    }
  });
})();
