function signS3(input, preview, imageUrl) {
  if (!input && !preview && !imageUrl) return;

  input.addEventListener("change", () => {
    const files = input.files;
    const file = files[0];

    if (file == null) {
      return;
    }

    getSignedRequest(file);
  });

  /*
		Function to carry out the actual PUT request to S3 using the signed request from the app.
	*/
  function uploadFile(file, signedRequest, url) {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedRequest);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          preview.src = url;
          imageUrl.value = url;
        } else {
          alert("Could not upload file.");
        }
      }
    };
    xhr.send(file);
  }

  /*
		Function to get the temporary signed request from the app.
		If request successful, continue to upload the file using this signed
		request.
	*/
  function getSignedRequest(file) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/sign-s3?file-name=${file.name}&file-type=${file.type}`);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          uploadFile(file, response.signedRequest, response.url);
        } else {
          alert("Could not get signed URL.");
        }
      }
    };
    xhr.send();
  }
}

export default signS3;
