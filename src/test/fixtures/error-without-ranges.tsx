import React from "react";

export default function ErrorWithoutRanges() {
  const ref = React.useRef("initial");

  ref.current = "updated";

  return <div>{ref.current}</div>;
}
