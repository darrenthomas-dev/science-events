function onSubmitGetCoordinates(form, address, lat, lng, btn) {
  if (!form && !address && !lat && !lng && !btn) return;

  btn.addEventListener("click", function(e) {
    if (lat.value && lng.value) {
      console.log(lat.value, lng.value);
      return;
    }

    e.preventDefault();

    // Get places info
    const place = new google.maps.places.Autocomplete(address);

    // Add lng lat values to inputs
    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();

    console.log("found values: ", lat.value, lng.value, "now submitting...");

    // Submit form
    form.submit();
  });
}

export default onSubmitGetCoordinates;
