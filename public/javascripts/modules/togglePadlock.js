function togglePadlock(padlock) {
  if (!padlock) return;

  padlock.addEventListener("click", function() {
    const closed = this.querySelector(".padlock-img--closed");
    const label = this.querySelector(".padlock-label");

    closed.style.display = closed.style.display === "none" ? "block" : "none";
    label.title =
      label.title === "Click to disable button."
        ? "Click to enable button."
        : "Click to disable button.";
  });
}

export default togglePadlock;
