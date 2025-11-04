import React from "react";

async function doStuff() {}

export default function Foo() {
  async function onSubmit() {
    try {
      await doStuff();
    } catch (error) {
      const errorString = (() => {
        if (!(error instanceof Error)) {
          return "An unexpected error occurred";
        }

        return error.message;
      })();

      console.log(errorString);
    }
  }

  return <form onSubmit={onSubmit} />;
}
