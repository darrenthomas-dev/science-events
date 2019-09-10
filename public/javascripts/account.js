toggleLock(
  document.querySelector("#deleteEventbriteId"),
  document.querySelector("#unlockDeleteEventbriteId")
);

toggleLock(
  document.querySelector("#deleteAccount"),
  document.querySelector("#unlockDeleteAccount")
);

function toggleLock(input, toggle) {
  toggle.addEventListener("click", function() {
    toggle.checked ? (input.disabled = false) : (input.disabled = true);
  });
}
