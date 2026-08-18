import React from "react";

// Opted in via "use memo" — should compile under compilationMode: "annotation".
export function OptedInComponent({ name }: { name: string }) {
  "use memo";

  return <div>Hello {name}</div>;
}

// Plain component without an opt-in directive — under "annotation" the compiler
// should leave this alone, but under "infer" it would still be compiled.
export function PlainComponent({ name }: { name: string }) {
  return <div>Hi {name}</div>;
}
