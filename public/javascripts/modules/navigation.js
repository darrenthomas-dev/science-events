import { $ } from "./bling";

function displayNavigation(btn) {
  if (!btn) return;
  const nav = $(".nav__section");

  btn.addEventListener("click", function() {
    btn.classList.toggle("is-active");
    nav.classList.contains("menu--is-active")
      ? nav.classList.remove("menu--is-active")
      : nav.classList.add("menu--is-active");
  });
}

export default displayNavigation;
