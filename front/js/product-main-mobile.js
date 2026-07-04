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
let currentUser = null;
let selectedRating = 0;
let reviewPhotoFiles = [];
let starsInitialized = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const mainImage = document.getElementById('main-image');
  if (!mainImage) return;

  mainImage.src = src;

  document.querySelectorAll('#product-thumbnails img').forEach((img) => {
    const isActive = img.src === mainImage.src;
    img.classList.toggle('active-thumb', isActive);
    img.style.opacity = isActive ? '1' : '0.6';
  });
}

async function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    document.getElementById('product-name').textContent = 'Product Not Found';
    document.getElementById('product-description').textContent = 'Missing product id in URL.';
    return;
  }

  currentProductId = Number(productId);

  try {
    const res = await fetch(`${API_URL}/products/${productId}`, {
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
    document.getElementById('product-price').innerHTML = `€${Number(product.price).toFixed(2)} <span>Tax included.</span>`;
    document.getElementById('product-description').textContent = product.description || 'No description yet.';

    const mainImage = document.getElementById('main-image');
    const thumbContainer = document.getElementById('product-thumbnails');
    const allImages = [
      { path: product.path },
      ...(product.product_images || []),
    ].filter((img) => img && img.path);

    if (allImages.length) {
      const firstSrc = `./front_admin/uploads/products/${allImages[0].path}`;
      mainImage.src = firstSrc;
      mainImage.alt = product.name;

      thumbContainer.innerHTML = allImages.map((img, index) => {
        const src = `./front_admin/uploads/products/${img.path}`;
        return `<img
          src="${escapeHtml(src)}"
          onclick="swapMainImage('${escapeHtml(src)}')"
          style="opacity:${index === 0 ? '1' : '0.6'};"
          class="${index === 0 ? 'active-thumb' : ''}"
          alt="${escapeHtml(product.name)}"
        >`;
      }).join('');
    } else {
      mainImage.src = 'assets/logo/logo.png';
      mainImage.alt = product.name;
      thumbContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('Failed to load product:', error);
    document.getElementById('product-name').textContent = 'Failed to load product';
    document.getElementById('product-description').textContent = 'Please try again later.';
  }
}

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
  const container = document.getElementById('review-list');
  if (!container) return;

  if (!reviews.length) {
    container.innerHTML = '<div class="review review-empty">No reviews yet. Be the first!</div>';
    return;
  }

  container.innerHTML = reviews.map((review) => {
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
      <button type="button" class="review-photo-remove" onclick="removeReviewPhoto(${index})">✕</button>
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

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('qty-minus').addEventListener('click', () => setQty(currentQty - 1));
  document.getElementById('qty-plus').addEventListener('click', () => setQty(currentQty + 1));
  document.getElementById('add-to-cart-btn').addEventListener('click', addToCart);

  await loadProductDetails();
  await checkLoginState();
  await loadReviews();
});

