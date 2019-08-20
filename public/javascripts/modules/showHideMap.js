import { $ } from "./bling";

function displayMap(mapDiv) {
  if (!mapDiv) return;
  $(".map__button").on("click", function() {
    this.innerText = this.textContent === "Hide map" ? "Show map" : "Hide map";
    mapDiv.style.display = mapDiv.style.display === "none" ? "block" : "none";
  });
}

export default displayMap;
