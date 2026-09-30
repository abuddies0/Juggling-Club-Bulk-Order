// const FORM_LINK =
//  "https://docs.google.com/forms/d/e/1FAIpQLScI-1qgMCGhQgzdsenBt1MzKtdyFpCehfJFjNnA-YG3qHFIhg/viewform?usp=pp_url&entry.13087554={{NAME}}&entry.2096004215={{EMAIL}}&entry.927686952={{ITEM_NAME}}&entry.1026536920={{ITEM_SKU}}&entry.1024599410={{ITEM_QTY}}&entry.1629513907={{ITEM_COLOR}}";

const FORM_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSfbJgphqpuB3G9-JdHrKdFjhXXxlXwhq9_Wv-ieHgdSgnDtSw/viewform?usp=pp_url&entry.13087554=%7B%7BNAME%7D%7D&entry.2096004215=%7B%7BEMAIL%7D%7D&entry.927686952=%7B%7BITEM_NAME%7D%7D&entry.1026536920=%7B%7BITEM_SKU%7D%7D&entry.1024599410=%7B%7BITEM_QTY%7D%7D&entry.1629513907=%7B%7BITEM_COLOR%7D%7D";

const data_url = "yoyosam_products_simple.json";

const CART_STORAGE_KEY = "juggling_bulk_order_cart";

const THEME_STORAGE_KEY = "juggling_bulk_order_theme";

const BUYER_INFO_STORAGE_KEY = "juggling_bulk_order_buyer_info";

const PRODUCTS_PER_PAGE = 100;

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const cardContainer = document.getElementById("card-container");

const searchInput = document.getElementById("search-input");

const typeFilter = document.getElementById("type-filter");

const colorFilter = document.getElementById("color-filter");

const vendorFilter = document.getElementById("vendor-filter");

const confidenceDropdown = document.getElementById("confidence-dropdown");

const confidenceDropdownButton = document.getElementById("confidence-dropdown-button");

const confidenceDropdownMenu = document.getElementById("confidence-dropdown-menu");

const confidenceDropdownLabel = document.getElementById("confidence-dropdown-label");

const confidenceOptions = confidenceDropdownMenu.querySelectorAll('input[type="checkbox"]');

const minPriceInput = document.getElementById("min-price");

const maxPriceInput = document.getElementById("max-price");

const clearFiltersButton = document.getElementById("clear-filters");

const resultCount = document.getElementById("result-count");

const loadMoreButton = document.getElementById("load-more");

const loadMoreContainer = document.getElementById("load-more-container");

/* ===== Cart ===== */

const cartButton = document.getElementById("cart-button");

const cartCount = document.getElementById("cart-count");

const cartOverlay = document.getElementById("cart-overlay");

const closeCartButton = document.getElementById("close-cart");

const cartItemsContainer = document.getElementById("cart-items");

const emptyCart = document.getElementById("empty-cart");

const cartBulkTotal = document.getElementById("cart-bulk-total");

const cartVendorTotal = document.getElementById("cart-vendor-total");

const cartSavings = document.getElementById("cart-savings");

const copyOrderButton = document.getElementById("copy-order");

const clearCartButton = document.getElementById("clear-cart");

const clearCartDialog = document.getElementById("clear-cart-dialog");

const cancelClearCartButton = document.getElementById("cancel-clear-cart");

const confirmClearCartButton = document.getElementById("confirm-clear-cart");

const checkoutButton = document.getElementById("checkout-button");

const checkoutDialog = document.getElementById("checkout-dialog");

const cancelCheckoutButton = document.getElementById("cancel-checkout");

const confirmCheckoutButton = document.getElementById("confirm-checkout");

const buyerNameInput = document.getElementById("buyer-name");

const buyerEmailInput = document.getElementById("buyer-email");

const buyerEmailConfirmInput = document.getElementById("buyer-email-confirm");

const checkoutError = document.getElementById("checkout-error");

/* ===== Theme ===== */

const themeToggle = document.getElementById("theme-toggle");

/* =========================================================
   STATE
   ========================================================= */

let productData = [];

let filteredProducts = [];

let visibleProductCount = PRODUCTS_PER_PAGE;

let cart = loadCart();

/* =========================================================
   UTILITIES
   ========================================================= */

function parsePrice(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(String(value).replace(/[$,\s]/g, ""));

  return Number.isFinite(number) ? number : 0;
}

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProductID(product) {
  return [product.sku, product.upc, product.name, product.color].map(normalize).join("|");
}

function getSelectedConfidences() {
  return [...confidenceOptions].filter((option) => option.checked).map((option) => option.value);
}

function updateConfidenceDropdownLabel() {
  const selected = getSelectedConfidences();

  if (selected.length === 0) {
    confidenceDropdownLabel.textContent = "Confidence";

    return;
  }

  if (selected.length === confidenceOptions.length) {
    confidenceDropdownLabel.textContent = "All Confidence";

    return;
  }

  const names = selected.map((value) => {
    return value.charAt(0).toUpperCase() + value.slice(1);
  });

  confidenceDropdownLabel.textContent = `Confidence: ${names.join(", ")}`;
}

/* =========================================================
   CART STORAGE
   ========================================================= */

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load cart:", error);

    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

  updateCartUI();
}

/* =========================================================
   BUYER STORAGE
   ========================================================= */

function loadBuyerInfo() {
  try {
    const saved = localStorage.getItem(BUYER_INFO_STORAGE_KEY);

    if (!saved) {
      return {
        name: "",
        email: "",
      };
    }

    const info = JSON.parse(saved);

    return {
      name: info.name || "",
      email: info.email || "",
    };
  } catch (error) {
    console.error("Failed to load buyer information:", error);

    return {
      name: "",
      email: "",
    };
  }
}

function saveBuyerInfo(name, email) {
  localStorage.setItem(
    BUYER_INFO_STORAGE_KEY,
    JSON.stringify({
      name,
      email,
    }),
  );
}

/* =========================================================
   MAIN
   ========================================================= */

async function main() {
  console.log("Fetching product details...");

  try {
    const response = await fetch(data_url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    productData = await response.json();

    if (!Array.isArray(productData)) {
      throw new Error("Product data is not an array.");
    }

    /*
     * Precompute values used repeatedly
     * during filtering/rendering.
     */

    for (const product of productData) {
      product._id = getProductID(product);

      product._normalizedName = normalize(product.name);

      product._normalizedType = normalize(product.type);

      product._normalizedColor = normalize(product.color);

      product._normalizedVendor = normalize(product.vendor);

      product._normalizedConfidence = normalize(product.confidence);

      product._orderPrice = parsePrice(product.order_price);

      product._sitePrice = parsePrice(product.site_price);
    }

    console.log(`Loaded ${productData.length} products.`);

    initializeFilters();

    applyFilters();
    updateConfidenceDropdownLabel();

    updateCartUI();

  } catch (error) {
    console.error("Failed to load product data:", error);

    const loadingScreen = document.getElementById("loading-screen");

    if (loadingScreen) {
      loadingScreen.remove();
    }

    resultCount.textContent = "Failed to load products.";
  }
}

/* =========================================================
   FILTER INITIALIZATION
   ========================================================= */

function initializeFilters() {
  populateFilter(
    typeFilter,
    productData.map((product) => product.type),
  );

  populateFilter(
    colorFilter,
    productData.map((product) => product.color),
  );

  populateFilter(
    vendorFilter,
    productData.map((product) => product.vendor),
  );
}

function populateFilter(select, values) {
  const uniqueValues = [
    ...new Set(
      values
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim())
        .filter((value) => value !== ""),
    ),
  ];

  uniqueValues.sort((a, b) => a.localeCompare(b));

  const fragment = document.createDocumentFragment();

  for (const value of uniqueValues) {
    const option = document.createElement("option");

    option.value = value;

    option.textContent = value;

    fragment.appendChild(option);
  }

  select.appendChild(fragment);
}

/* =========================================================
   FILTERING
   ========================================================= */

function applyFilters() {
  const search = normalize(searchInput.value);

  const selectedType = normalize(typeFilter.value);

  const selectedColor = normalize(colorFilter.value);

  const selectedVendor = normalize(vendorFilter.value);

  const selectedConfidences = getSelectedConfidences();

  const minPrice = parsePrice(minPriceInput.value);

  const maxPrice = maxPriceInput.value === "" ? Infinity : parsePrice(maxPriceInput.value);

  filteredProducts = productData.filter((product) => {
    if (search && !product._normalizedName.includes(search)) {
      return false;
    }

    if (selectedType && product._normalizedType !== selectedType) {
      return false;
    }

    if (selectedColor && product._normalizedColor !== selectedColor) {
      return false;
    }

    if (selectedVendor && product._normalizedVendor !== selectedVendor) {
      return false;
    }

    if (selectedConfidences.length > 0 && !selectedConfidences.includes(product._normalizedConfidence)) {
      return false;
    }

    if (product._orderPrice < minPrice || product._orderPrice > maxPrice) {
      return false;
    }

    return true;
  });

  visibleProductCount = PRODUCTS_PER_PAGE;

  renderProducts();
}

function clearFilters() {
  searchInput.value = "";

  typeFilter.value = "";
  colorFilter.value = "";
  vendorFilter.value = "";
  for (const option of confidenceOptions) {
    option.checked = option.value === "high" || option.value === "medium";
  }

  updateConfidenceDropdownLabel();

  minPriceInput.value = "";
  maxPriceInput.value = "";

  applyFilters();
}

/* =========================================================
   PRODUCT RENDERING
   ========================================================= */

function renderProducts() {
  cardContainer.innerHTML = "";

  const visibleProducts = filteredProducts.slice(0, visibleProductCount);

  if (filteredProducts.length === 0) {
    resultCount.textContent = "No products found.";

    loadMoreContainer.style.display = "none";

    return;
  }

  resultCount.textContent = `Showing ${visibleProducts.length.toLocaleString()} of ${filteredProducts.length.toLocaleString()} products`;

  const fragment = document.createDocumentFragment();

  for (const product of visibleProducts) {
    fragment.appendChild(createProductCard(product));
  }

  cardContainer.appendChild(fragment);

  if (visibleProductCount < filteredProducts.length) {
    loadMoreContainer.style.display = "flex";

    loadMoreButton.textContent = `Load More (${Math.min(PRODUCTS_PER_PAGE, filteredProducts.length - visibleProductCount)})`;
  } else {
    loadMoreContainer.style.display = "none";
  }
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function createProductCard(product) {
  const card = document.createElement("div");

  card.className = "card";

  const id = product._id;

  const price = product._orderPrice;

  const oldPrice = product._sitePrice;

  const inCart = Boolean(cart[id]);

  card.innerHTML = `

        <div class="card-image-wrapper">

            <a
                href="${escapeHTML(product.product_url)}"
                target="_blank"
                rel="noopener noreferrer"
            >

                <img
                    src="${escapeHTML(product.image_url)}"
                    alt="${escapeHTML(product.name)}"
                    loading="lazy"
                >

            </a>

        </div>


        <div class="card-content">

            <h2 class="card-title">
                ${escapeHTML(product.name)}
            </h2>


            <hr class="simple-line">


            <h2 class="card-color">
                ${escapeHTML(product.color)}
            </h2>


            <hr class="simple-line">


            <p class="price-container">

                <div class="price-top-row">

                    <span class="card-oldprice">
                        ${formatPrice(oldPrice)}
                    </span>

                    <span class="card-sku">
                        SKU: ${escapeHTML(product.sku || "N/A")}
                    </span>

                </div>

                <span class="card-price">
                    ${formatPrice(price)}
                </span>

            </p>


            <button
                class="card-btn ${inCart ? "remove-from-cart" : ""}"
                data-product-id="${escapeHTML(id)}"
            >

                ${inCart ? "Remove From Cart" : "Add to Cart"}

            </button>

        </div>
    `;

  return card;
}

/* =========================================================
   LOAD MORE
   ========================================================= */

loadMoreButton.addEventListener("click", () => {
  visibleProductCount += PRODUCTS_PER_PAGE;

  renderProducts();
});

/* =========================================================
   CART OPERATIONS
   ========================================================= */

function addToCart(product) {
  const id = product._id;

  if (cart[id]) {
    cart[id].quantity++;
  } else {
    cart[id] = {
      product,
      quantity: 1,
    };
  }

  saveCart();

  renderProducts();
}

function removeFromCart(id) {
  delete cart[id];

  saveCart();

  renderProducts();
}

function changeQuantity(id, amount) {
  if (!cart[id]) {
    return;
  }

  cart[id].quantity += amount;

  if (cart[id].quantity <= 0) {
    delete cart[id];
  }

  saveCart();

  renderProducts();
}

async function copyOrder() {
  const entries = Object.values(cart);

  if (entries.length === 0) {
    return;
  }

  const order = entries
    .map((cartItem) => {
      const product = cartItem.product;

      const quantity = cartItem.quantity;

      const identifier = product.sku?.trim() || product.name;

      return `${identifier}: ${quantity}`;
    })
    .join(",\n");

  try {
    await navigator.clipboard.writeText(order);

    const originalText = "Copy Order";

    copyOrderButton.textContent = "Copied to Clipboard!";

    copyOrderButton.disabled = true;

    setTimeout(() => {
      copyOrderButton.textContent = originalText;

      copyOrderButton.disabled = false;
    }, 2500);
  } catch (error) {
    console.error("Failed to copy order:", error);
  }
}

function clearCart() {
  if (Object.keys(cart).length === 0) {
    return;
  }

  clearCartDialog.classList.remove("hidden");
}

function confirmClearCart() {
  cart = {};

  saveCart();

  renderProducts();

  clearCartDialog.classList.add("hidden");
}

/* =========================================================
   CART UI
   ========================================================= */

function updateCartUI() {
  let itemCount = 0;

  for (const item of Object.values(cart)) {
    itemCount += item.quantity;
  }

  cartCount.textContent = itemCount;

  renderCart();
}

function renderCart() {
  cartItemsContainer.innerHTML = "";

  const entries = Object.entries(cart);

  copyOrderButton.disabled = entries.length === 0;

  if (entries.length === 0) {
    emptyCart.style.display = "block";

    cartBulkTotal.textContent = "$0.00";

    cartVendorTotal.textContent = "$0.00";

    cartSavings.textContent = "$0.00";

    return;
  }

  emptyCart.style.display = "none";

  let bulkTotal = 0;

  let vendorTotal = 0;

  const fragment = document.createDocumentFragment();

  for (const [id, cartItem] of entries) {
    const product = cartItem.product;

    const quantity = cartItem.quantity;

    const bulkPrice = parsePrice(product.order_price);

    const vendorPrice = parsePrice(product.site_price);

    bulkTotal += bulkPrice * quantity;

    vendorTotal += vendorPrice * quantity;

    const item = document.createElement("div");

    item.className = "cart-item";

    item.innerHTML = `

            <img
                class="cart-item-image"
                src="${escapeHTML(product.image_url)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
            >


            <div class="cart-item-info">

                <div class="cart-item-name">
                    ${escapeHTML(product.name)}
                </div>


                <div class="cart-item-color">
                    ${escapeHTML(product.color)}
                </div>


                <div class="cart-item-prices">

                    <span class="cart-item-bulk">
                        ${formatPrice(bulkPrice)}
                    </span>

                    × ${quantity}

                    <span class="cart-item-vendor">
                        ${formatPrice(vendorPrice)}
                    </span>

                </div>

            </div>


            <div class="cart-item-controls">

                <button
                    class="quantity-button"
                    data-cart-action="decrease"
                    data-product-id="${escapeHTML(id)}"
                >
                    −
                </button>


                <span class="quantity">
                    ${quantity}
                </span>


                <button
                    class="quantity-button"
                    data-cart-action="increase"
                    data-product-id="${escapeHTML(id)}"
                >
                    +
                </button>


                <button
                    class="remove-button"
                    data-cart-action="remove"
                    data-product-id="${escapeHTML(id)}"
                >
                    ×
                </button>

            </div>
        `;

    fragment.appendChild(item);
  }

  cartItemsContainer.appendChild(fragment);

  const savings = vendorTotal - bulkTotal;

  cartBulkTotal.textContent = formatPrice(bulkTotal);

  cartVendorTotal.textContent = formatPrice(vendorTotal);

  cartSavings.textContent = formatPrice(Math.max(0, savings));
}

function groupCartItemsForCheckout() {
  const groups = new Map();

  for (const cartItem of Object.values(cart)) {
    const product = cartItem.product;

    const quantity = cartItem.quantity;

    const name = product.name || "";

    if (!groups.has(name)) {
      groups.set(name, {
        name,
        quantity: 0,
        colors: [],
        sku: product.sku || "",
      });
    }

    const group = groups.get(name);

    group.quantity += quantity;

    const color = product.color?.trim();

    if (color) {
      group.colors.push({
        quantity,
        color,
      });
    }
  }

  return [...groups.values()];
}

function createCheckoutURL(group, name, email) {
  const url = new URL(FORM_LINK);

  const colorText = group.colors.map((entry) => `${entry.quantity} ${entry.color}`).join(", ");

  const replacements = {
    "{{NAME}}": name,
    "{{EMAIL}}": email,
    "{{ITEM_NAME}}": group.name,
    "{{ITEM_SKU}}": group.sku.replace(/-.*$/g, ""),
    "{{ITEM_QTY}}": String(group.quantity),
    "{{ITEM_COLOR}}": colorText,
  };

  for (const [label, value] of Object.entries(replacements)) {
    for (const [key, existingValue] of url.searchParams.entries()) {
      if (existingValue === label) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

function openCheckoutDialog() {
  const buyerInfo = loadBuyerInfo();

  buyerNameInput.value = buyerInfo.name;

  buyerEmailInput.value = buyerInfo.email;

  buyerEmailConfirmInput.value = buyerInfo.email;

  checkoutError.textContent = "";

  checkoutError.classList.add("hidden");

  checkoutDialog.classList.remove("hidden");

  buyerNameInput.focus();
}

function submitCheckout() {
  const name = buyerNameInput.value.trim();

  const email = buyerEmailInput.value.trim();

  const emailConfirm = buyerEmailConfirmInput.value.trim();

  checkoutError.classList.add("hidden");

  checkoutError.textContent = "";

  if (!name) {
    showCheckoutError("Please enter your name.");

    buyerNameInput.focus();

    return;
  }

  if (!email) {
    showCheckoutError("Please enter your email address.");

    buyerEmailInput.focus();

    return;
  }

  if (!emailConfirm) {
    showCheckoutError("Please retype your email address.");

    buyerEmailConfirmInput.focus();

    return;
  }

  if (email !== emailConfirm) {
    showCheckoutError("The email addresses do not match.");

    buyerEmailConfirmInput.focus();

    return;
  }

  if (!buyerEmailInput.checkValidity()) {
    showCheckoutError("Please enter a valid email address.");

    buyerEmailInput.focus();

    return;
  }

  const groups = groupCartItemsForCheckout();

  if (groups.length === 0) {
    return;
  }

  saveBuyerInfo(name, email);

  /*
   * Open all tabs immediately while this function
   * is still executing as the result of the user's
   * Checkout click.
   */
  const windows = groups.map(() => window.open("about:blank", "_blank"));

  /*
   * Check whether the browser blocked any popups.
   */
  const blocked = windows.some((window) => !window);

  if (blocked) {
    for (const window of windows) {
      if (window) {
        window.close();
      }
    }

    showCheckoutError("Your browser blocked the checkout tabs. " + "Please allow pop-ups for this site and try again.");

    return;
  }

  /*
   * Now that all tabs have been opened, navigate
   * each one to its corresponding Google Form.
   */
  groups.forEach((group, index) => {
    const url = createCheckoutURL(group, name, email);

    windows[index].location.href = url;
  });

  checkoutDialog.classList.add("hidden");
}

function showCheckoutError(message) {
  checkoutError.textContent = message;

  checkoutError.classList.remove("hidden");
}

/* =========================================================
   PRODUCT CARD EVENT DELEGATION
   ========================================================= */

cardContainer.addEventListener("click", (event) => {
  const button = event.target.closest(".card-btn");

  if (!button) {
    return;
  }

  const id = button.dataset.productId;

  const product = productData.find((product) => product._id === id);

  if (!product) {
    return;
  }

  if (cart[id]) {
    removeFromCart(id);
  } else {
    addToCart(product);
  }
});

/* =========================================================
   CART EVENT DELEGATION
   ========================================================= */

cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.cartAction;

  const id = button.dataset.productId;

  if (action === "increase") {
    changeQuantity(id, 1);
  } else if (action === "decrease") {
    changeQuantity(id, -1);
  } else if (action === "remove") {
    removeFromCart(id);
  }
});

/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

let searchTimeout;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(applyFilters, 100);
});

typeFilter.addEventListener("change", applyFilters);

colorFilter.addEventListener("change", applyFilters);

vendorFilter.addEventListener("change", applyFilters);

minPriceInput.addEventListener("input", applyFilters);

maxPriceInput.addEventListener("input", applyFilters);

clearFiltersButton.addEventListener("click", clearFilters);

confidenceDropdownButton.addEventListener("click", (event) => {
  event.stopPropagation();
  confidenceDropdownMenu.classList.toggle("hidden");
});

for (const option of confidenceOptions) {
  option.addEventListener("change", () => {
    updateConfidenceDropdownLabel();
    applyFilters();
  });
}

document.addEventListener("click", (event) => {
  if (!confidenceDropdown.contains(event.target)) {
    confidenceDropdownMenu.classList.add("hidden");
  }
});

/* =========================================================
   CART OPEN / CLOSE
   ========================================================= */

cartButton.addEventListener("click", () => {
  cartOverlay.classList.remove("hidden");
});

closeCartButton.addEventListener("click", () => {
  cartOverlay.classList.add("hidden");
});

cartOverlay.addEventListener("click", (event) => {
  if (event.target === cartOverlay) {
    cartOverlay.classList.add("hidden");
  }
});

copyOrderButton.addEventListener("click", copyOrder);

clearCartButton.addEventListener("click", clearCart);

cancelClearCartButton.addEventListener("click", () => {
  clearCartDialog.classList.add("hidden");
});

confirmClearCartButton.addEventListener("click", confirmClearCart);

clearCartDialog.addEventListener("click", (event) => {
  if (event.target === clearCartDialog) {
    clearCartDialog.classList.add("hidden");
  }
});

checkoutButton.addEventListener("click", openCheckoutDialog);

cancelCheckoutButton.addEventListener("click", () => {
  checkoutDialog.classList.add("hidden");
});

confirmCheckoutButton.addEventListener("click", submitCheckout);

checkoutDialog.addEventListener("click", (event) => {
  if (event.target === checkoutDialog) {
    checkoutDialog.classList.add("hidden");
  }
});

/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cartOverlay.classList.contains("hidden")) {
    cartOverlay.classList.add("hidden");
  }

  if (event.key === "Escape" && !clearCartDialog.classList.contains("hidden")) {
    clearCartDialog.classList.add("hidden");
  }
});

/* =========================================================
   ENTER KEY
   ========================================================= */
checkoutDialog.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName === "INPUT") {
    submitCheckout();
  }
});

/* =========================================================
   DARK MODE
   ========================================================= */

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");

    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");

    themeToggle.textContent = "🌙";
  }
}

function toggleTheme() {
  const darkMode = document.body.classList.toggle("dark-mode");

  localStorage.setItem(THEME_STORAGE_KEY, darkMode ? "dark" : "light");

  themeToggle.textContent = darkMode ? "☀️" : "🌙";
}

themeToggle.addEventListener("click", toggleTheme);

/* =========================================================
   START
   ========================================================= */

loadTheme();

main();
