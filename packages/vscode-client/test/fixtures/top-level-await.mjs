// No Flow pragma, so this must stay on @babel/parser: hermes-parser has no
// support for top-level await and would reject the first statement.
import { useState } from "react";

const config = await fetch("/config.json");

export function AwaitComponent() {
  const [open, setOpen] = useState(false);

  return <div onClick={() => setOpen(!open)}>{config.url}</div>;
}
