import { $ } from "./bling";

function displayNavigation(btn) {
  if (!btn) return;

  const nav = $(".nav__section");
  const logo = $(".nav__logo");
  const iconOpen = $(".menu-icon-open");
  const iconClose = $(".menu-icon-close");

  btn.addEventListener("click", function() {
    if (!this.classList.contains("nav__button--open")) {
      this.classList.add("nav__button--open");
      nav.classList.add("mobile-menu--show");
      logo.classList.add("hide");

      iconOpen.style.display = "none";
      iconClose.style.display = "block";
    } else {
      this.classList.remove("nav__button--open");
      nav.classList.remove("mobile-menu--show");
      logo.classList.remove("hide");

      iconOpen.style.display = "block";
      iconClose.style.display = "none";
    }
  });
}

export default displayNavigation;
