function showPassword(input) {
  if (!input) return;

  const show = document.querySelector("#showPassword");

  show.addEventListener("click", e => {
    e.preventDefault();

    if (input.type === "password") {
      input.type = "text";
      show.innerText = "Hide Password";
    } else {
      input.type = "password";
      show.innerText = "Show Password";
    }
  });
}

export default showPassword;
