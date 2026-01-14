export function isVSCodeClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("visual studio code") ?? false;
}

export function isIntelliJClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("intellij") ?? false;
}

export function supportsCommandLinks(clientName?: string): boolean {
  return isVSCodeClient(clientName) || isIntelliJClient(clientName);
}

export function shouldEnableHover(clientName?: string): boolean {
  return !isVSCodeClient(clientName) && !isIntelliJClient(clientName);
}
