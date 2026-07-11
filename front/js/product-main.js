const API_URL = '';

let currentQty = 1;
let productId = null;
let currentProduct = null;
let productSections = [];

function escapeHtml(str) {

  if (!str) return '';

  return String(str)

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;')

    .replace(/'/g, '&#39;');

}

// ── PRODUCT SECTIONS (Admin-configurable) ─────────────────────────

function renderAccordion(sections, defaultOpenId) {
  return (sections || [])
    .map(s => {
      const id = Number(s.id);
      const title = escapeHtml(s.title || 'Section');
      const isOpen = defaultOpenId !== null && id === Number(defaultOpenId);
      return `
        <div class="product-section ${isOpen ? 'open' : ''}" data-section-id="${id}">
          <button type="button" class="product-section-head" data-accordion-head="1">
            <span class="product-section-title">${title}</span>
            <span class="product-section-chevron">▾</span>
          </button>
          <div class="product-section-body">${s.content_html || ''}</div>
        </div>
      `;
    })
    .join('');
}

function attachAccordionHandlers(container) {
  container.querySelectorAll('[data-accordion-head="1"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.product-section');
      if (!wrap) return;
      wrap.classList.toggle('open');
    });
  });
}

async function loadProductSections() {
  if (!productId) return;

  const container = document.getElementById('product-sections');
  if (!container) return;
  container.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/product-sections/product/${productId}`);
    if (!res.ok) return;
    productSections = await res.json();
  } catch (e) {
    return;
  }

  const legacyAboutEl = document.getElementById('product-description');

  // If no admin-configured sections exist, build a single "About" accordion block from legacy description.
  if (!Array.isArray(productSections) || productSections.length === 0) {
    const html = legacyAboutEl ? legacyAboutEl.innerHTML : '<p></p>';
    container.innerHTML = renderAccordion(
      [
        {
          id: 0,
          title: 'About',
          content_html: html,
        },
      ],
      0,
    );
    attachAccordionHandlers(container);
    return;
  }

  // Expand "About" by default if present, otherwise the first section.
  const defaultOpen =
    productSections.find(s => String(s.slug || '').toLowerCase() === 'about') ||
    productSections[0];
  const defaultOpenId = defaultOpen ? Number(defaultOpen.id) : null;

  container.innerHTML = renderAccordion(productSections, defaultOpenId);
  attachAccordionHandlers(container);
}

// Optional modal helpers (product page currently uses accordion, but HTML has the overlay)
function closeSectionModal(event) {
  if (event && event.target && event.target.closest && event.target.closest('.section-modal')) return;
  const overlay = document.getElementById('section-modal');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

// Handle shopping bag item additions

function changeQty(amount) {
  const stock = currentProduct?.stock ?? 99;
  currentQty += amount;
  if (currentQty < 1) currentQty = 1;
  if (currentQty > stock) currentQty = stock;
  document.getElementById('qty-count').innerText = currentQty;
}

async function addToCart() {
  if (!productId) return;

  const stock = currentProduct?.stock ?? 0;
  if (stock <= 0) {
    alert('Sorry, this product is out of stock.');
    return;
  }
  if (currentQty > stock) {
    alert(`Only ${stock} in stock. Please reduce your quantity.`);
    currentQty = stock;
    document.getElementById('qty-count').innerText = currentQty;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: parseInt(productId), quantity: currentQty }),
    });
    if (res.status === 401) {
      window.location.href = '/register.html';
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Could not add to cart.');
      return;
    }
    alert(`${currentProduct?.name || 'Item'} added to cart!`);
    window.dispatchEvent(new Event('cartUpdated'));
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

function buyNow() {
  addToCart().then(() => {
    window.location.href = 'checkout.html';
  });
}



function swapMainImage(src) {


  const mainImg = document.getElementById('main-product-image');
  if (mainImg) {
    mainImg.src = src;
    mainImg.style.display = 'block';
  }

  document.querySelectorAll('#product-thumbnails img').forEach(img => {

    const isActive = img.src.endsWith(src.split('/').pop());

    img.classList.toggle('active-thumb', isActive);

    img.style.opacity = isActive ? '1' : '0.6';

  });

}



async function loadProductDetails() {

  // 1. Extract dynamic search payload parameter string values

  const urlParams = new URLSearchParams(window.location.search);

  productId = urlParams.get('id');



  if (!productId) {

    console.error('Error parsing route URL structure: Id criteria not detected.');

    document.getElementById('product-name').innerText = 'Product Not Found';

    return;

  }



  try {



    const res = await fetch(`${API_URL}/products/public/${productId}`, {

      method: 'GET',

      credentials: 'include'

    });



    if (!res.ok) {

      throw new Error(`Server returned network initialization exception status: ${res.status}`);

    }



    currentProduct = await res.json();
    const product = currentProduct;



    if (!product) {

      document.getElementById('product-name').innerText = 'Product Out of Stock';

      return;

    }





    document.title = `${product.name} – Lisa’s Lashes`;

    document.getElementById('product-name').innerText = product.name;

    // Right column uses dynamic accordion sections, not a duplicate product title
    const subTitleEl = document.getElementById('product-sub-title');
    if (subTitleEl) subTitleEl.style.display = 'none';

    document.getElementById('product-price').innerHTML = `€${parseFloat(product.price).toFixed(2)} <span>Tax included.</span>`;

    // Stock badge
    const stock = product.stock ?? 0;
    const stockBadge = document.getElementById('stock-badge');
    if (stockBadge) {
      if (stock <= 0) {
        stockBadge.innerHTML = '<span style="color:#e74c3c;font-weight:600;">Out of Stock</span>';
      } else if (stock <= 5) {
        stockBadge.innerHTML = `<span style="color:#c9a84c;font-weight:600;">Only ${stock} left in stock</span>`;
      } else {
        stockBadge.innerHTML = `<span style="color:#27ae60;">In Stock (${stock} available)</span>`;
      }
    }

    const maxLabel = document.getElementById('qty-max-label');
    if (maxLabel) maxLabel.textContent = stock > 0 ? `Max: ${stock}` : '';

    const cartBtn = document.querySelector('.btn-outline');
    const buyBtn = document.querySelector('.btn-dark');
    if (stock <= 0) {
      if (cartBtn) { cartBtn.disabled = true; cartBtn.style.opacity = '0.5'; }
      if (buyBtn) { buyBtn.disabled = true; buyBtn.style.opacity = '0.5'; }
    }



    const fallbackAbout = 'Product details will be added soon.';
    const legacyAboutEl = document.getElementById('product-description');
    if (legacyAboutEl) legacyAboutEl.innerHTML = `<p>${escapeHtml(fallbackAbout)}</p>`;





    if (product.path) {

      const mainImgUrl = `./front_admin/uploads/products/${product.path}`;

      const mainImg = document.getElementById('main-product-image');
      if (mainImg) {
        mainImg.src = mainImgUrl;
        mainImg.style.display = 'block';
      }



      // Build thumbnail list: main image first, then gallery images

      const allImages = [

        { path: product.path },

        ...(product.product_images || []),

      ];



      const thumbContainer = document.getElementById('product-thumbnails');

      thumbContainer.innerHTML = allImages.map((img, i) => {

        const src = `./front_admin/uploads/products/${img.path}`;

        return `<img

            src="${escapeHtml(src)}"

            onclick="swapMainImage('${escapeHtml(src)}')"

            style="width:31%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer;opacity:${i === 0 ? '1' : '0.6'};transition:opacity 0.2s;"

            onmouseover="this.style.opacity='1'"

            onmouseout="if(!this.classList.contains('active-thumb'))this.style.opacity='0.6'"

            class="${i === 0 ? 'active-thumb' : ''}"

            >`;

      }).join('');

    } else {

      const mainImg = document.getElementById('main-product-image');
      if (mainImg) {
        mainImg.src = 'assets/logo/logo.png';
        mainImg.style.display = 'block';
      }

    }



  } catch (error) {

    console.error('Hydration process failure:', error);

    document.getElementById('product-name').innerText = 'Network error loading item';

    const legacyAboutEl = document.getElementById('product-description');
    if (legacyAboutEl) legacyAboutEl.innerHTML = '<p>Unable to maintain socket communication with server modules.</p>';

  }

}



// Trigger loading script automatically upon page initialization

document.addEventListener('DOMContentLoaded', async () => {

  await loadProductDetails();

  await loadProductSections();

  await checkLoginState();

  await loadReviews();

});



// ── REVIEWS ────────────────────────────────────────────────────────



let selectedRating = 0;

let reviewPhotoFiles = [];



async function checkLoginState() {

  try {

    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include', cache: 'no-store' });

    if (!res.ok) { currentUser = null; return; }

    currentUser = await res.json();

  } catch (e) { currentUser = null; }

}



let currentUser = null;



async function loadReviews() {

  const urlParams = new URLSearchParams(window.location.search);

  const productId = urlParams.get('id');

  if (!productId) return;



  try {

    const res = await fetch(`${API_URL}/reviews/product/${productId}`);

    if (!res.ok) return;

    const reviews = await res.json();

    renderReviewList(reviews);

    renderReviewSummary(reviews);

  } catch (e) {

    console.error('Could not load reviews:', e);

  }



  await renderWriteReviewState();

}



function renderReviewList(reviews) {

  const container = document.getElementById('review-list');

  if (!reviews.length) {

    container.innerHTML = `<div class="review" style="text-align:center;color:#999;grid-column:1/-1;">No reviews yet. Be the first!</div>`;

    return;

  }

  container.innerHTML = reviews.map(r => {

    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);

    const name = escapeHtml((r.user?.first_name || '') + ' ' + (r.user?.last_name?.[0] || '') + '.');

    const date = r.created_at ? r.created_at.split('T')[0] : '';

    const photos = (r.review_images || []).map(img =>

      `<img src="./front_admin/uploads/reviews/${escapeHtml(img.path)}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #eee;">`

    ).join('');



    return `

        <div class="review">

          <div class="review-name" style="display:flex;justify-content:space-between;align-items:center;">

            <span>${name}</span>

            <span style="color:#c0a060;letter-spacing:1px;">${stars}</span>

          </div>

          <div style="font-size:11px;color:#bbb;margin-bottom:10px;">${date}</div>

          <div style="font-size:15px;line-height:1.6;color:#444;">${escapeHtml(r.comment)}</div>

          ${photos ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${photos}</div>` : ''}

        </div>

      `;

  }).join('');

}



function renderReviewSummary(reviews) {

  if (!reviews.length) return;

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const el = document.getElementById('reviews-summary');

  el.textContent = `★ ${avg} average · ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;

  el.style.display = 'block';



  // Update the static rating line near the product title

  document.querySelector('.rating').innerHTML =

    `★★★★★ <span>Based on <b>${reviews.length} review${reviews.length !== 1 ? 's' : ''}</b></span>`;

}



async function renderWriteReviewState() {

  const urlParams = new URLSearchParams(window.location.search);

  const productId = urlParams.get('id');



  if (!currentUser) {

    document.getElementById('review-login-prompt').style.display = 'block';

    return;

  }



  try {

    const res = await fetch(`${API_URL}/reviews/product/${productId}/mine`, { credentials: 'include' });

    if (res.ok) {

      const existing = await res.json();

      if (existing) {

        document.getElementById('review-already').style.display = 'block';

        return;

      }

    }

  } catch (e) { }



  document.getElementById('review-form').style.display = 'block';

  setupStarPicker();

}



function setupStarPicker() {

  const stars = document.querySelectorAll('.star-pick');

  stars.forEach(star => {

    star.addEventListener('click', () => {

      selectedRating = parseInt(star.dataset.val);

      updateStarDisplay(selectedRating);

      const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

      document.getElementById('star-label').textContent = labels[selectedRating];

    });

    star.addEventListener('mouseenter', () => updateStarDisplay(parseInt(star.dataset.val)));

    star.addEventListener('mouseleave', () => updateStarDisplay(selectedRating));

  });

}



function updateStarDisplay(val) {

  document.querySelectorAll('.star-pick').forEach(s => {

    s.style.color = parseInt(s.dataset.val) <= val ? '#c0a060' : '#ddd';

  });

}



function handleReviewPhotoPick(input) {

  if (!input.files) return;

  const remaining = 5 - reviewPhotoFiles.length;

  Array.from(input.files).slice(0, remaining).forEach(file => {

    if (file.size > 4 * 1024 * 1024) { alert(`"${file.name}" exceeds 4 MB.`); return; }

    const reader = new FileReader();

    reader.onload = e => {

      reviewPhotoFiles.push({ file, previewUrl: e.target.result });

      renderReviewPhotoPreviews();

    };

    reader.readAsDataURL(file);

  });

  input.value = '';

}



function renderReviewPhotoPreviews() {

  document.getElementById('review-photo-preview').innerHTML = reviewPhotoFiles.map((item, idx) => `

      <div style="position:relative;width:60px;height:60px;border-radius:4px;overflow:hidden;border:1px solid #eee;">

        <img src="${item.previewUrl}" style="width:100%;height:100%;object-fit:cover;">

        <button onclick="removeReviewPhoto(${idx})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">✕</button>

      </div>

    `).join('');

}



function removeReviewPhoto(idx) {

  reviewPhotoFiles.splice(idx, 1);

  renderReviewPhotoPreviews();

}



async function submitReview() {

  const urlParams = new URLSearchParams(window.location.search);

  const productId = urlParams.get('id');

  const comment = document.getElementById('review-comment').value.trim();

  const statusEl = document.getElementById('review-submit-status');

  const btn = document.getElementById('review-submit-btn');



  if (!selectedRating) { statusEl.textContent = 'Please select a star rating.'; statusEl.style.color = '#c0392b'; return; }

  if (!comment) { statusEl.textContent = 'Please write a comment.'; statusEl.style.color = '#c0392b'; return; }



  btn.disabled = true;

  statusEl.textContent = 'Submitting…';

  statusEl.style.color = '#999';



  try {

    const formData = new FormData();

    formData.append('rating', selectedRating);

    formData.append('comment', comment);

    reviewPhotoFiles.forEach(item => formData.append('photos', item.file));



    const res = await fetch(`${API_URL}/reviews/product/${productId}`, {

      method: 'POST',

      credentials: 'include',

      body: formData,

    });



    if (!res.ok) {

      const err = await res.json().catch(() => ({}));

      statusEl.textContent = err.message || 'Could not submit review.';

      statusEl.style.color = '#c0392b';

      btn.disabled = false;

      return;

    }



    document.getElementById('review-form').style.display = 'none';

    document.getElementById('review-already').style.display = 'block';

    document.getElementById('review-already-msg').textContent =

      'Thank you! Your review is pending approval and will appear shortly.';



  } catch (e) {

    statusEl.textContent = 'Network error. Please try again.';

    statusEl.style.color = '#c0392b';

    btn.disabled = false;

  }

}
