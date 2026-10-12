import styled from "styled-components";

import { chip } from "../../theme/controls.js";

// One line at the masthead's end, as small as the file's name beside it.
const style = (Component) => styled(Component)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--font-size-tiny);
  color: var(--color-secondary-text);

  button {
    ${chip}
  }
`;

export default style;
