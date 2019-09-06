import { $ } from "./bling";

function displayNavigation(btn) {
  if (!btn) return;

  const nav = $(".nav__section");
  const logo = $(".nav__logo");

  btn.addEventListener("click", function() {
    if (!this.classList.contains("nav__button--open")) {
      this.classList.add("nav__button--open");
      nav.classList.add("mobile-menu--show");
      logo.classList.add("hide");
    } else {
      this.classList.remove("nav__button--open");
      nav.classList.remove("mobile-menu--show");
      logo.classList.remove("hide");
    }
  });
}

export default displayNavigation;
