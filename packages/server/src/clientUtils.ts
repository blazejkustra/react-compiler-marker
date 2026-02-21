export function isVSCodeClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("visual studio code") ?? false;
}

export function isCursorClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("cursor") ?? false;
}

export function isAntigravityClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("antigravity") ?? false;
}

export function isIntelliJClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("intellij") ?? false;
}

export function isNVimClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("neovim") ?? false;
}

export function isZedClient(clientName?: string): boolean {
  return clientName?.toLowerCase().includes("zed") ?? false;
}

export function supportsCommandLinks(clientName?: string): boolean {
  return !isNVimClient(clientName) && !isZedClient(clientName);
}

export function shouldEnableHover(clientName?: string): boolean {
  return isNVimClient(clientName);
}

export function supportsFixWithAI(clientName?: string): boolean {
  return (
    isVSCodeClient(clientName) || isCursorClient(clientName) || isAntigravityClient(clientName)
  );
}
