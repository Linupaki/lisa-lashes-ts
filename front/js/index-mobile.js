function startProductsAutoScroll() {
  const carousel = document.getElementById('productsCarousel');
  if (!carousel) return;

  setInterval(() => {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    if (carousel.scrollLeft >= maxScroll - 10) {
      carousel.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    } else {
      carousel.scrollBy({
        left: 320,
        behavior: 'smooth'
      });
    }
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  startProductsAutoScroll();

  const cta = document.getElementById('book-now-cta');
  if (cta) {
    const go = () => {
      document.querySelector('.calendar-section')?.scrollIntoView({ behavior: 'smooth' });
    };
    cta.addEventListener('click', go);
    cta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  }
});
