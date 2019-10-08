// When user scrolls x pixels from top of the document show scroll to top link.

function scrollToTop(toTop, x) {
  if (!toTop) return;

  window.onscroll = () => scrollFunction();

  function scrollFunction() {
    if (document.body.scrollTop > x || document.documentElement.scrollTop > x) {
      toTop.style.display = "block";
    } else {
      toTop.style.display = "none";
    }
  }
}

export default scrollToTop;
