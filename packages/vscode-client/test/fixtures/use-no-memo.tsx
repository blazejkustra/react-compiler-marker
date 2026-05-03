import React from "react";

// Opted out via "use no memo" — the compiler emits CompileSkip for this one.
export function OptedOutComponent({ name }: { name: string }) {
  "use no memo";

  return <div>Hello {name}</div>;
}

// Compiles cleanly.
export function CompiledComponent({ name }: { name: string }) {
  return <div>Hello {name}</div>;
}

// Genuine compile failure — mutates a ref outside an effect — must remain in the failed bucket.
export function FailingComponent() {
  const ref = React.useRef("initial");

  ref.current = "updated";

  return <div>{ref.current}</div>;
}
