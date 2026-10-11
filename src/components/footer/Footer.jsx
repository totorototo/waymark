import style from "./Footer.style.js";

// Terminus's footer (its wizard and story end): the one line closing the page, under the
// setup alone or under the story.
function Footer({ className }) {
  return <footer className={className}>© 2026 waymark — La Vallée</footer>;
}

export default style(Footer);
