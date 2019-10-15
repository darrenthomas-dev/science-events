function spinner(form) {
  if (!form) return;

  form.addEventListener("submit", function() {
    let spinner = document.createElement("div");
    spinner.classList.add("spinner");
    spinner.innerHTML = '<div class="loader"><p>Loading...</p></div>';

    document.body.style = "overflow: hidden";
    document.body.appendChild(spinner);
  });
}

export default spinner;
