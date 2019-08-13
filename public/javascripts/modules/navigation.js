import { $ } from "./bling";

function displayNavigation(btn) {
  if (!btn) return;

  const nav = $(".nav__section");

  btn.addEventListener("click", function() {
    if (nav.style.display === "grid") {
      btn.className = "nav__button nav__button--close";
      nav.style.display = "none";
    } else {
      nav.style.display = "grid";
      btn.className = "nav__button nav__button--open";
    }
  });
}

export default displayNavigation;
