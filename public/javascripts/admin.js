const cb = document.querySelectorAll("input[type='checkbox']");

cb.forEach(function(elem) {
  elem.addEventListener("change", function(e) {
    const id = e.target.id;
    const n = id.substring(id.indexOf("_") + 1);
    if (id.includes("add")) {
      document.querySelector("#remove_" + n).checked = false;
    } else {
      document.querySelector("#add_" + n).checked = false;
    }
  });
});
