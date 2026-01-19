export function isVSCodeClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("visual studio code") ?? false;
}

export function isIntelliJClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("intellij") ?? false;
}

export function isNVimClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("neovim") ?? false;
}

export function supportsCommandLinks(clientName?: string): boolean {
  return !isNVimClient(clientName);
}

export function shouldEnableHover(clientName?: string): boolean {
  return isNVimClient(clientName);
}
