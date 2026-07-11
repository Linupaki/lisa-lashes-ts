document.addEventListener("DOMContentLoaded", async () => {
  const sliders = document.querySelectorAll(".product-slider");
  if (!sliders.length) return;

  const API_URL = ''; // Target your running NestJS URL

  // Helper XSS payload escaper safety function
  function escapeSliderHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function hideSectionDivider(sliderElement) {
    // 1. Check if the element right before the slider is the divider
    const prevEl = sliderElement.previousElementSibling;
    if (prevEl && (prevEl.classList.contains('section-divider') || prevEl.classList.contains('divider') || prevEl.tagName === 'HR')) {
      prevEl.style.display = 'none';
      return;
    }

    // 2. Fallback: If elements are grouped or separated by layout containers, look globally
    const globalDivider = document.querySelector('.section-divider');
    if (globalDivider) {
      globalDivider.style.display = 'none';
    }
  }

  // Loop through all sliders present on the page layout
  for (const element of sliders) {
    const wrapper = element.querySelector('#dynamic-swiper-wrapper');
    if (!wrapper) continue;

    let products = [];

    try {
      const res = await fetch(`${API_URL}/products/slider`);
      products = await res.json();

      // If there are no products or fewer than 8, hide the whole feature block and its line divider
      if (!products || products.length < 8) {
        element.style.display = 'none';
        hideSectionDivider(element);
        continue;
      }

      // Render individual slider slides securely (Handles both Images and Videos seamlessly)
      wrapper.innerHTML = products.map(p => {
        const mediaUrl = `../../front_admin/uploads/products/` + p.path;
        const formattedPrice = parseFloat(p.price).toFixed(2);

        let visualAssetHtml = `<img src="${mediaUrl}" alt="${escapeSliderHtml(p.name)}" style="object-fit: cover; width: 100%; height: 100%;" />`;
        if (p.path && p.path.toLowerCase().endsWith('.mp4')) {
          visualAssetHtml = `<video src="${mediaUrl}" muted loop autoplay playsinline style="object-fit: cover; width: 100%; height: 100%;"></video>`;
        }

        return `
          <div class="product-slider__slide swiper-slide">
            <div class="product-slider__item product-slider-item">
              <div class="product-slider-item__image">
                ${visualAssetHtml}
              </div>
              <div class="product-slider-item__content">
                <div class="product-slider-item__header">
                  <div class="product-slider-item__header-inner">
                    <div class="product-slider-item__price">€${formattedPrice}</div>
                  </div>
                </div>
                <div class="product-slider-item__info">
                  <h2 class="product-slider-item__title">${escapeSliderHtml(p.name)}</h2>
                </div>
                <div class="product-slider-item__footer">
                  <a class="product-slider-item__btn" href="product-main.html?id=${p.id}">View</a>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Error rendering dynamic product carousel slider elements:', err);
      element.style.display = 'none';
      hideSectionDivider(element);
      continue;
    }

    const [slider, prevEl, nextEl] = [
      element.querySelector(".swiper") || element.querySelector(".product-slider__slider"),
      element.querySelector(".slider-nav__item_prev"),
      element.querySelector(".slider-nav__item_next")
    ];

    const totalSlidesCount = products.length;

    new Swiper(slider, {
      slidesPerView: "auto",
      spaceBetween: 20,
      speed: 600,
      observer: true,
      observeParents: true,
      watchOverflow: true,
      watchSlidesProgress: true,
      centeredSlides: true,
      loop: true,
      loopedSlides: Math.min(8, totalSlidesCount),
      initialSlide: 0,
      navigation: { nextEl, prevEl, disabledClass: "disabled" },
      breakpoints: {
        768: { spaceBetween: 40 },
        1200: { spaceBetween: 60 }
      }
    });
  }
});
