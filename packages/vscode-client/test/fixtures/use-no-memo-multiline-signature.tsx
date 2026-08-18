import React from "react";

type Props = {
  ingredient: string;
  updateIngredient: () => void;
  autoFocusInput: boolean;
};

// The compiler reports CompileSkip with the *body* location — with a multi-line
// signature that is the `}: Props) {` line, not the `function` line (line 11).
function SkippedComponent({
  ingredient,
  updateIngredient,
  autoFocusInput,
}: Props) {
  "use no memo";
  return <div>{ingredient}</div>;
}

// Same for arrows: the remapped location must be the `const` line (line 21).
const SkippedArrow = ({
  ingredient,
}: {
  ingredient: string;
}) => {
  "use no memo";
  return <div>{ingredient}</div>;
};
