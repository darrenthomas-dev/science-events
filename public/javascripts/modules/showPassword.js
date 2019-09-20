function showPassword(input) {
  if (!input) return;

  const show = document.querySelector("#showPassword");
  const text = show.querySelector("span");

  show.addEventListener("click", e => {
    e.preventDefault();

    if (input.type === "password") {
      input.type = "text";
      text.innerText = "Click to hide password.";
    } else {
      input.type = "password";
      text.innerText = "Click to show password.";
    }
  });
}

export default showPassword;
