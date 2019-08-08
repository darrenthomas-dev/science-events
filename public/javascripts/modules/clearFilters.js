import { $, $$ } from "./bling";

const clearFilters = reset => {
  if (!reset) return;
  reset.on("click", function() {
    resetCheckboxes();
    resetDate();
    resetPrice();
  });
};

const resetCheckboxes = () => {
  const checkboxes = $$("input[type=checkbox]");
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = false;
  }
};

const resetDate = () => {
  const start = $("#startDatetime");
  const end = $("#endDatetime");
  start.value = new Date().toISOString().slice(0, 10);
  end.value = "";
};

const resetPrice = () => {
  const min = $("#minPrice");
  const max = $("#maxPrice");
  min.value = "0.00";
  max.value = "1000.00";
};

export default clearFilters;
