// @flow strict-local
import { useState } from "react";

// `readonly` in an object type — rejected by @babel/parser's flow plugin,
// accepted by hermes-parser. This is the construct from issue #80.
type Props = {
  ref?: React.RefObject<{ readonly closeMenu: () => void } | null>,
};

export const FlowComponent = ({ ref }: Props): React.Node => {
  const [open, setOpen] = useState(false);

  return <div onClick={() => setOpen(!open)} />;
};
