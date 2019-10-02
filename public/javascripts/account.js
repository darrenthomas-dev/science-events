toggleLock(
  document.querySelector("#deleteEventbriteId"),
  document.querySelector("#unlockDeleteEventbriteId")
);

toggleLock(
  document.querySelector("#deleteAccount"),
  document.querySelector("#unlockDeleteAccount")
);

function toggleLock(input, toggle) {
  if (!input) return;

  toggle.addEventListener("click", function() {
    toggle.checked ? (input.disabled = false) : (input.disabled = true);
  });
}
