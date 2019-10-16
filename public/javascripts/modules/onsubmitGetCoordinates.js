function onSubmitGetCoordinates(form, address, lat, lng, btn) {
  if (!form && !lat && !lng && !btn) return;

  btn.addEventListener("click", function(e) {
    e.preventDefault();

    // Get places info
    const place = new google.maps.places.Autocomplete(address);

    // Add lng lat values to inputs
    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();

    // Submit form
    form.submit();
  });
}

export default onSubmitGetCoordinates;
