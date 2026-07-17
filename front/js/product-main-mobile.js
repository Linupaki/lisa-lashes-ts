function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API_URL = window.location.origin;

let currentQty = 1;
let currentProductId = null;
let currentProduct = null;
let productSections = [];
let currentUser = null;
let selectedRating = 0;
let reviewPhotoFiles = [];
let starsInitialized = false;

// Reviews list state (mobile)
const REVIEWS_INITIAL_LIMIT = 4;
let cachedReviews = [];
let reviewsVisibleCount = REVIEWS_INITIAL_LIMIT;

// Gallery state (mobile)
let galleryImages = [];
let galleryIndex = 0;
let gallerySwipeBound = false;
let touchStartX = 0;
let touchStartY = 0;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getActiveDiscountInfo(product, now = new Date()) {
  const d = product?.product_discount;
  if (!d) return null;

  const orig = Number(product?.price);
  if (!Number.isFinite(orig)) return null;

  const value = Number(d.discount_value);
  if (!Number.isFinite(value) || value <= 0) return null;

  const start = d.start_time ? new Date(d.start_time) : null;
  const end = d.end_time ? new Date(d.end_time) : null;

  if (start && !Number.isNaN(start.getTime()) && start > now) return null;
  if (end && !Number.isNaN(end.getTime()) && end < now) return null;

  let sale = orig;
  if (d.discount_type === 'percentage') {
    sale = orig * (1 - value / 100);
  } else {
    sale = orig - value;
  }

  sale = Math.max(0, sale);
  if (!(sale < orig)) return null;

  return {
    orig,
    sale,
    label: d.discount_label || '',
  };
}

function setQty(next) {
  currentQty = Math.max(1, next);
  const qtyCount = document.getElementById('qty-count');
  if (qtyCount) qtyCount.textContent = String(currentQty);
}

function showMessage(text, isError = false) {
  const el = document.getElementById('cart-message');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', isError);
}

async function addToCart() {
  if (!currentProductId) {
    showMessage('Product is not loaded yet', true);
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: currentProductId,
        quantity: currentQty,
      }),
    });

    if (res.status === 401) {
      window.location.href = 'login-mobile.html';
      return false;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to add to cart: ${res.status}`);
    }

    showMessage(`${currentProduct?.name || 'Item'} added to cart!`);
    window.dispatchEvent(new Event('cartUpdated'));
    return true;
  } catch (error) {
    console.error(error);
    showMessage('Failed to add to cart', true);
    return false;
  }
}

async function buyNow() {
  const added = await addToCart();
  if (added) {
    window.location.href = 'checkout-mobile.html';
  }
}

function swapMainImage(src) {
  const idx = (galleryImages || []).findIndex(x => String(x) === String(src));
  if (idx >= 0) {
    setGalleryIndex(idx);
    return;
  }
  // Fallback: just set src
  const mainImage = document.getElementById('main-image');
  if (!mainImage) return;
  mainImage.src = src;
}

function setGalleryIndex(nextIndex) {
  if (!galleryImages || !galleryImages.length) return;
  galleryIndex = Math.max(0, Math.min(galleryImages.length - 1, Number(nextIndex)));

  const mainImage = document.getElementById('main-image');
  if (mainImage) {
    mainImage.src = galleryImages[galleryIndex];
    mainImage.style.display = 'block';
  }

  // Update active thumb
  document.querySelectorAll('#product-thumbnails img').forEach((img, i) => {
    const isActive = i === galleryIndex;
    img.classList.toggle('active-thumb', isActive);
    img.style.opacity = isActive ? '1' : '0.7';
    if (isActive && img.scrollIntoView) {
      // Keep current thumb visible
      img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

function bindGallerySwipe() {
  if (gallerySwipeBound) return;
  const mainImage = document.getElementById('main-image');
  if (!mainImage) return;
  gallerySwipeBound = true;

  mainImage.addEventListener('touchstart', (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  mainImage.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // Only horizontal swipes
    if (Math.abs(dx) < 40) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) {
      // Swipe left → next
      setGalleryIndex(galleryIndex + 1);
    } else {
      // Swipe right → prev
      setGalleryIndex(galleryIndex - 1);
    }
  }, { passive: true });
}

// ── PRODUCT SECTIONS (Mobile accordion) ─────────────────────────

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
  if (!currentProductId) return;
  const container = document.getElementById('product-sections');
  if (!container) return;
  container.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/product-sections/product/${currentProductId}`);
    if (!res.ok) return;
    productSections = await res.json();
  } catch (e) {
    return;
  }

  const legacyTitle = document.getElementById('product-subtitle');
  const legacyDesc = document.getElementById('product-description');

  if (!Array.isArray(productSections) || productSections.length === 0) {
    // No sections yet: show a single About accordion
    const html = `<p>${escapeHtml(legacyDesc?.textContent || 'Product details will be added soon.')}</p>`;
    container.innerHTML = renderAccordion([{ id: 0, title: 'About', content_html: html }], null);
    attachAccordionHandlers(container);
    return;
  }

  // Hide legacy block if we have dynamic sections
  if (legacyTitle) legacyTitle.style.display = 'none';
  if (legacyDesc) legacyDesc.style.display = 'none';

  // On mobile we keep accordion collapsed by default
  container.innerHTML = renderAccordion(productSections, null);
  attachAccordionHandlers(container);
}

async function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  // Hide current/placeholder image immediately to avoid flashing while fetching
  const mainImage = document.getElementById('main-image');
  if (mainImage) {
    mainImage.style.display = 'none';
  }

  if (!productId) {
    document.getElementById('product-name').textContent = 'Product Not Found';
    document.getElementById('product-description').textContent = 'Missing product id in URL.';
    return;
  }

  currentProductId = Number(productId);

  try {
    const res = await fetch(`${API_URL}/products/public/${productId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch product: ${res.status}`);
    }

    const product = await res.json();
    currentProduct = product;

    document.title = `${product.name} – Lisa's Lashes`;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-subtitle').textContent = product.name;

    const discount = getActiveDiscountInfo(product);
    const priceEl = document.getElementById('product-price');
    if (priceEl) {
      if (discount) {
        priceEl.innerHTML = `
          <div class="product-price-row">
            <span class="product-price-original">€${discount.orig.toFixed(2)}</span>
            <span class="product-price-sale">€${discount.sale.toFixed(2)}</span>
          </div>
          <div class="product-price-sub">
            <span>Tax included.</span>
            ${discount.label ? `<span class="product-sale-label">${escapeHtml(discount.label)}</span>` : ''}
          </div>
        `;
      } else {
        priceEl.innerHTML = `€${Number(product.price).toFixed(2)} <span>Tax included.</span>`;
      }
    }
    document.getElementById('product-description').textContent = 'Product details will be added soon.';

    // (mainImage already declared above)
    const thumbContainer = document.getElementById('product-thumbnails');
    const allImages = [
      { path: product.path },
      ...(product.product_images || []),
    ].filter((img) => img && img.path);

    if (allImages.length) {
      galleryImages = allImages.map(img => `./front_admin/uploads/products/${img.path}`);
      galleryIndex = 0;
      const firstSrc = galleryImages[0];
      if (mainImage) {
        // show image only after it fully loads
        mainImage.onload = () => {
          mainImage.style.display = 'block';
          mainImage.onload = null;
        };
        mainImage.src = firstSrc;
      }
      mainImage.alt = product.name;

      thumbContainer.innerHTML = galleryImages
        .map((src, index) => {
          return `<img
            src="${escapeHtml(src)}"
            data-gallery-index="${index}"
            style="opacity:${index === 0 ? '1' : '0.7'};"
            class="${index === 0 ? 'active-thumb' : ''}"
            alt="${escapeHtml(product.name)}"
          >`;
        })
        .join('');

      bindGallerySwipe();
    } else {
      if (mainImage) {
        mainImage.onload = () => {
          mainImage.style.display = 'block';
          mainImage.onload = null;
        };
        mainImage.src = 'assets/logo/logo.png';
        mainImage.alt = product.name;
      }
      thumbContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('Failed to load product:', error);
    document.getElementById('product-name').textContent = 'Failed to load product';
    document.getElementById('product-description').textContent = 'Please try again later.';

    // Show placeholder image on error
    if (mainImage) {
      mainImage.style.display = 'block';
    }
  }
}

// Trigger loading
document.addEventListener('DOMContentLoaded', async () => {
  const minus = document.getElementById('qty-minus');
  const plus = document.getElementById('qty-plus');
  const addBtn = document.getElementById('add-to-cart-btn');
  const buyNowBtn = document.getElementById('buy-now-btn');
  const reviewFileInput = document.getElementById('review-photos-input');
  const reviewSubmitBtn = document.getElementById('review-submit-btn');
  if (minus) minus.addEventListener('click', () => setQty(currentQty - 1));
  if (plus) plus.addEventListener('click', () => setQty(currentQty + 1));
  if (addBtn) addBtn.addEventListener('click', addToCart);
  if (buyNowBtn) buyNowBtn.addEventListener('click', buyNow);
  if (reviewFileInput) reviewFileInput.addEventListener('change', (e) => handleReviewPhotoPick(e.target));
  if (reviewSubmitBtn) reviewSubmitBtn.addEventListener('click', submitReview);

  // Delegated gallery thumb clicks (no inline onclick)
  const thumbs = document.getElementById('product-thumbnails');
  if (thumbs) {
    thumbs.addEventListener('click', (e) => {
      const img = e.target && e.target.closest ? e.target.closest('img[data-gallery-index]') : null;
      if (!img) return;
      const idx = Number(img.getAttribute('data-gallery-index'));
      if (Number.isFinite(idx)) setGalleryIndex(idx);
    });
  }

  // Delegated review photo remove (no inline onclick)
  const preview = document.getElementById('review-photo-preview');
  if (preview) {
    preview.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-remove-photo-index]') : null;
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-remove-photo-index'));
      if (Number.isFinite(idx)) removeReviewPhoto(idx);
    });
  }

  const moreBtn = document.getElementById('reviews-more-btn');
  const lessBtn = document.getElementById('reviews-less-btn');

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      reviewsVisibleCount = Math.min((cachedReviews || []).length, reviewsVisibleCount + REVIEWS_INITIAL_LIMIT);
      renderReviewListFromCache();
    });
  }

  if (lessBtn) {
    lessBtn.addEventListener('click', () => {
      reviewsVisibleCount = REVIEWS_INITIAL_LIMIT;
      renderReviewListFromCache();
      const section = document.getElementById('reviews-section');
      if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  await loadProductDetails();
  await loadProductSections();
  await checkLoginState();
  await loadReviews();
});

async function checkLoginState() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      currentUser = null;
      return;
    }
    currentUser = await res.json();
  } catch (error) {
    currentUser = null;
  }
}

async function loadReviews() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  if (!productId) return;

  try {
    const res = await fetch(`${API_URL}/reviews/product/${productId}`);
    if (!res.ok) return;

    const reviews = await res.json();
    renderReviewList(reviews);
    renderReviewSummary(reviews);
  } catch (error) {
    console.error('Could not load reviews:', error);
  }

  await renderWriteReviewState();
}

function renderReviewList(reviews) {
  cachedReviews = Array.isArray(reviews) ? reviews : [];
  // Reset to collapsed view on each load
  reviewsVisibleCount = REVIEWS_INITIAL_LIMIT;
  renderReviewListFromCache();
}

function updateReviewsPager() {
  const pager = document.getElementById('reviews-pager');
  const moreBtn = document.getElementById('reviews-more-btn');
  const lessBtn = document.getElementById('reviews-less-btn');

  const total = (cachedReviews || []).length;
  const showPager = total > REVIEWS_INITIAL_LIMIT;

  if (pager) pager.style.display = showPager ? 'flex' : 'none';
  if (!showPager) return;

  const canMore = reviewsVisibleCount < total;
  const canLess = reviewsVisibleCount > REVIEWS_INITIAL_LIMIT;

  if (moreBtn) moreBtn.disabled = !canMore;
  if (lessBtn) lessBtn.disabled = !canLess;
}

function renderReviewListFromCache() {
  const container = document.getElementById('review-list');
  if (!container) return;

  if (!cachedReviews.length) {
    container.innerHTML = '<div class="review review-empty">No reviews yet. Be the first!</div>';
    updateReviewsPager();
    return;
  }

  const visible = cachedReviews.slice(0, Math.max(REVIEWS_INITIAL_LIMIT, reviewsVisibleCount));

  container.innerHTML = visible.map((review) => {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const firstName = review.user?.first_name || '';
    const lastNameInitial = review.user?.last_name ? `${review.user.last_name[0]}.` : '';
    const reviewerName = escapeHtml(`${firstName} ${lastNameInitial}`.trim() || 'Anonymous');
    const date = review.created_at ? review.created_at.split('T')[0] : '';
    const photos = (review.review_images || []).map((image) =>
      `<img class="review-photo" src="./front_admin/uploads/reviews/${escapeHtml(image.path)}" alt="review photo">`
    ).join('');

    return `
      <div class="review">
        <div class="review-name" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <span>${reviewerName}</span>
          <span style="color:#c0a060;letter-spacing:1px;">${stars}</span>
        </div>
        <div style="font-size:11px;color:#bbb;margin-bottom:10px;">${date}</div>
        <div style="font-size:15px;line-height:1.6;color:#444;">${escapeHtml(review.comment)}</div>
        ${photos ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${photos}</div>` : ''}
      </div>
    `;
  }).join('');

  updateReviewsPager();
}

function renderReviewSummary(reviews) {
  const summary = document.getElementById('reviews-summary');
  if (!summary) return;

  if (!reviews.length) {
    summary.textContent = '';
    return;
  }

  const avg = (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  summary.textContent = `★ ${avg} average · ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;

  const ratingEl = document.querySelector('.rating');
  if (ratingEl) {
    ratingEl.innerHTML = `★★★★★ <span>Based on <b>${reviews.length} review${reviews.length !== 1 ? 's' : ''}</b></span>`;
  }
}

async function renderWriteReviewState() {
  const loginPrompt = document.getElementById('review-login-prompt');
  const alreadyEl = document.getElementById('review-already');
  const formEl = document.getElementById('review-form');

  if (loginPrompt) loginPrompt.style.display = 'none';
  if (alreadyEl) alreadyEl.style.display = 'none';
  if (formEl) formEl.style.display = 'none';

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!currentUser) {
    if (loginPrompt) loginPrompt.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/reviews/product/${productId}/mine`, { credentials: 'include' });
    if (res.ok) {
      const existing = await res.json();
      if (existing) {
        if (alreadyEl) alreadyEl.style.display = 'block';
        return;
      }
    }
  } catch (error) {
    // If the lookup fails, still allow the user to leave a review.
  }

  if (formEl) formEl.style.display = 'block';
  setupStarPicker();
}

function setupStarPicker() {
  if (starsInitialized) return;
  starsInitialized = true;

  document.querySelectorAll('.star-pick').forEach((star) => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.val, 10);
      updateStarDisplay(selectedRating);
      const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
      const starLabel = document.getElementById('star-label');
      if (starLabel) starLabel.textContent = labels[selectedRating];
    });

    star.addEventListener('mouseenter', () => updateStarDisplay(parseInt(star.dataset.val, 10)));
    star.addEventListener('mouseleave', () => updateStarDisplay(selectedRating));
  });
}

function updateStarDisplay(val) {
  document.querySelectorAll('.star-pick').forEach((star) => {
    star.classList.toggle('active', parseInt(star.dataset.val, 10) <= val);
  });
}

function handleReviewPhotoPick(input) {
  if (!input.files) return;

  const remaining = 5 - reviewPhotoFiles.length;
  Array.from(input.files).slice(0, remaining).forEach((file) => {
    if (file.size > 4 * 1024 * 1024) {
      alert(`"${file.name}" exceeds 4 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      reviewPhotoFiles.push({ file, previewUrl: event.target.result });
      renderReviewPhotoPreviews();
    };
    reader.readAsDataURL(file);
  });

  input.value = '';
}

function renderReviewPhotoPreviews() {
  const preview = document.getElementById('review-photo-preview');
  if (!preview) return;

  preview.innerHTML = reviewPhotoFiles.map((item, index) => `
    <div class="review-photo-thumb">
      <img src="${item.previewUrl}" alt="review preview">
      <button type="button" class="review-photo-remove" data-remove-photo-index="${index}">✕</button>
    </div>
  `).join('');
}

function removeReviewPhoto(index) {
  reviewPhotoFiles.splice(index, 1);
  renderReviewPhotoPreviews();
}

async function submitReview() {
  if (!currentProductId) return;

  const comment = document.getElementById('review-comment').value.trim();
  const statusEl = document.getElementById('review-submit-status');
  const btn = document.getElementById('review-submit-btn');

  if (!selectedRating) {
    statusEl.textContent = 'Please select a star rating.';
    statusEl.style.color = '#c0392b';
    return;
  }

  if (!comment) {
    statusEl.textContent = 'Please write a comment.';
    statusEl.style.color = '#c0392b';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = 'Submitting…';
  statusEl.style.color = '#999';

  try {
    const formData = new FormData();
    formData.append('rating', selectedRating);
    formData.append('comment', comment);
    reviewPhotoFiles.forEach((item) => formData.append('photos', item.file));

    const res = await fetch(`${API_URL}/reviews/product/${currentProductId}`, {
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

    if (document.getElementById('review-form')) {
      document.getElementById('review-form').style.display = 'none';
    }
    if (document.getElementById('review-already')) {
      document.getElementById('review-already').style.display = 'block';
    }
    if (document.getElementById('review-already-msg')) {
      document.getElementById('review-already-msg').textContent = 'Thank you! Your review is pending approval and will appear shortly.';
    }

  } catch (error) {
    statusEl.textContent = 'Network error. Please try again.';
    statusEl.style.color = '#c0392b';
    btn.disabled = false;
  }
}

