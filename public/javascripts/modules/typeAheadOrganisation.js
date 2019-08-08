import axios from "axios";
import dompurify from "dompurify";

function searchResultsHTML(organisations) {
  return organisations
    .map(organisation => {
      return `
		<a href="/organisation/${organisation.organisation}" class="search__result">
			<strong>${organisation.organisation}</strong>
		</a>`;
    })
    .join("");
}

function typeAheadOrganisation(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search_organisation"]');
  const searchResults = search.querySelector(".search__results--organisation");

  searchInput.on("input", function() {
    if (!this.value) {
      searchResults.style.display = "none";
      return;
    }

    //  Show search result
    searchResults.style.display = "block";

    axios
      .get(`/api/search/organisation?q=${this.value}`)
      .then(res => {
        console.log(res.data);
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(
            searchResultsHTML(res.data)
          );
          return;
        }
        // no return data
        searchResults.innerHTML = dompurify.sanitize(
          `<div class="search__result">No results for ${this.value}</div>`
        );
      })
      .catch(err => {
        console.error(err);
      });
  });

  // handle keyboard inputs
  searchInput.on("keyup", e => {
    if (![38, 40, 13].includes(e.keyCode)) {
      return;
    }
    const activeClass = "search__result--active";
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll(".search__result");
    let next;
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      window.location = current.href;
      return;
    }

    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

export default typeAheadOrganisation;
