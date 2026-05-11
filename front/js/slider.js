document.addEventListener("DOMContentLoaded", () => {
const sliders = document.querySelectorAll(".product-slider");

if (!sliders.length) return;

const list = [];

sliders.forEach((element) => {
const [slider, prevEl, nextEl] = [
element.querySelector(".swiper"),
element.querySelector(".slider-nav__item_prev"),
element.querySelector(".slider-nav__item_next")
];

list.push(
new Swiper(slider, {
slidesPerView: "auto",
spaceBetween: 40,
speed: 600,
observer: true,
watchOverflow: true,
watchSlidesProgress: true,
centeredSlides: true,
loop: true,
loopedSlides: 8,
initialSlide: 0,
navigation: { nextEl, prevEl, disabledClass: "disabled" },
breakpoints: {
768: { spaceBetween: 60 }
}
})
);
});
});