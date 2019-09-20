function toggleState(container) {
  if (!container) return;

  container.addEventListener("click", function(e) {
    const icon = this.querySelector("path");
    icon.style.display = icon.style.display === "none" ? "block" : "none";
  });
}

export default toggleState;
