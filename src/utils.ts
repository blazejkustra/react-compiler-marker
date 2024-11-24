import * as vscode from "vscode";

function getThrottledFunction(
  func: (...args: any[]) => void,
  limit: number
): (editor: vscode.TextEditor) => void {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;

  return function (...args: any[]) {
    const now = Date.now();
    if (!lastRan || now - lastRan >= limit) {
      func(...args);
      lastRan = now;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        func(...args);
        lastRan = Date.now();
      }, limit - (now - lastRan));
    }
  };
}

export { getThrottledFunction };
