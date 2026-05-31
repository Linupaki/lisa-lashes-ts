document.addEventListener("DOMContentLoaded", async () => {
  const sliders = document.querySelectorAll(".product-slider");
  if (!sliders.length) return;

  const API_URL = 'http://localhost:3000'; // Target your running NestJS URL
  const list = [];

  // Helper XSS payload escaper safety function
  function escapeSliderHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Loop through all sliders present on the page layout
  for (const element of sliders) {
    const wrapper = element.querySelector('#dynamic-swiper-wrapper');

    // 🟢 DYNAMIC BACKEND INTEGRATION STEP
    // If this specific slider contains the dynamic wrapper, populate data first
    if (wrapper) {
      try {
        const res = await fetch(`${API_URL}/products/slider`);
        const products = await res.json();

        if (!products || !products.length) {
          wrapper.innerHTML = `<div class="swiper-slide" style="text-align: center; color: #888; padding: 40px; width: 100%;">No featured items selected for the slider.</div>`;
          // Continue initializing an empty/placeholder slider structure safely
        } else {
          // Loop and map individual slider rows securely
          wrapper.innerHTML = products.map(p => {
            const imgUrl = `../../front_admin/uploads/products/` + p.path;
            const formattedPrice = parseFloat(p.price).toFixed(2);

            return `
              <div class="product-slider__slide swiper-slide">
                <div class="product-slider__item product-slider-item">
                  <div class="product-slider-item__image">
                    <img src="${imgUrl}" alt="${escapeSliderHtml(p.name)}" style="object-fit: cover; width: 100%; height: 100%;" />
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
        }
      } catch (err) {
        console.error('Error rendering dynamic product carousel slider elements:', err);
        wrapper.innerHTML = `<div class="swiper-slide" style="text-align: center; color: #9b4c4c; padding: 40px; width: 100%;">Failed to load slider items.</div>`;
      }
    }

    // 🟢 ORIGINAL SWIPER CONFIGURATION BLOCK
    // Extract dynamic elements based on your layout queries
    const [slider, prevEl, nextEl] = [
      element.querySelector(".swiper") || element.querySelector(".product-slider__slider"),
      element.querySelector(".slider-nav__item_prev"),
      element.querySelector(".slider-nav__item_next")
    ];

    // Determine total elements inside the current initialization wrapper
    const totalSlidesCount = element.querySelectorAll('.swiper-slide').length;

    // Push the initialized Swiper instance to the global tracker tracking array
    list.push(
      new Swiper(slider, {
        slidesPerView: "auto",
        spaceBetween: 40,
        speed: 600,
        observer: true,
        observeParents: true, // Guarantees Swiper recalculates size attributes when HTML loads
        watchOverflow: true,
        watchSlidesProgress: true,
        centeredSlides: true,
        // Safe loop control: Loops only if there are slides populated inside the container 
        loop: totalSlidesCount > 2,
        loopedSlides: 8,
        initialSlide: 0,
        navigation: { nextEl, prevEl, disabledClass: "disabled" },
        breakpoints: {
          768: { spaceBetween: 60 }
        }
      })
    );
  }
});
