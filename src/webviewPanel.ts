import * as vscode from "vscode";
import { UnoptimizedComponent } from "./workspaceScan";

let currentPanel: vscode.WebviewPanel | undefined;
let currentComponents: UnoptimizedComponent[] = [];

export function showWebviewReport(
  context: vscode.ExtensionContext,
  components: UnoptimizedComponent[]
): void {
  currentComponents = components;

  if (currentPanel) {
    currentPanel.webview.html = getWebviewContent(components);
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    "reactCompilerReport",
    "React Compiler Report",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.iconPath = vscode.Uri.parse(
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMS41IC0xMC4yMzE3NCAyMyAyMC40NjM0OCI+CiAgPHRpdGxlPlJlYWN0IExvZ288L3RpdGxlPgogIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyLjA1IiBmaWxsPSIjNjFkYWZiIi8+CiAgPGcgc3Ryb2tlPSIjNjFkYWZiIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIi8+CiAgICA8ZWxsaXBzZSByeD0iMTEiIHJ5PSI0LjIiIHRyYW5zZm9ybT0icm90YXRlKDYwKSIvPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIiB0cmFuc2Zvcm09InJvdGF0ZSgxMjApIi8+CiAgPC9nPgo8L3N2Zz4="
  );

  currentPanel.webview.html = getWebviewContent(components);

  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case "openComponent":
          const component = currentComponents[message.index];
          if (component) {
            await openComponentInEditor(component);
          }
          break;
        case "rescan":
          await vscode.commands.executeCommand(
            "react-compiler-marker.showReport"
          );
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    null,
    context.subscriptions
  );
}

async function openComponentInEditor(
  component: UnoptimizedComponent
): Promise<void> {
  const document = await vscode.workspace.openTextDocument(component.filePath);
  const editor = await vscode.window.showTextDocument(document);

  if (component.detailLocation) {
    const start = new vscode.Position(
      component.detailLocation.startLine,
      component.detailLocation.startColumn
    );
    const end = new vscode.Position(
      component.detailLocation.endLine,
      component.detailLocation.endColumn
    );
    const range = new vscode.Range(start, end);

    editor.selection = new vscode.Selection(start, end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } else {
    const position = new vscode.Position(component.line, component.column);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  }
}

function getWebviewContent(components: UnoptimizedComponent[]): string {
  const tableRows = components
    .map((comp, index) => {
      const relativePath = vscode.workspace.asRelativePath(comp.filePath);
      return `
      <tr>
        <td>${comp.componentName}</td>
        <td>${relativePath}</td>
        <td>${comp.line + 1}</td>
        <td class="reason">${escapeHtml(comp.reason)}</td>
        <td>
          <button class="open-btn" onclick="openComponent(${index})">Open</button>
        </td>
      </tr>
    `;
    })
    .join("");

  const summary =
    components.length === 0
      ? "<p class='success'>All components are optimized by React Compiler!</p>"
      : `<p class='warning'>Found <strong>${components.length}</strong> unoptimized component${components.length === 1 ? "" : "s"}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Compiler Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    h1 {
      font-size: 24px;
      color: var(--vscode-foreground);
    }

    .rescan-btn {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 3px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rescan-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .rescan-btn:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .rescan-btn.loading span:first-child {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    .summary {
      margin-bottom: 20px;
      padding: 15px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }

    .success {
      color: var(--vscode-testing-iconPassed);
      font-weight: bold;
      font-size: 15px;
    }

    .warning {
      color: #f59e42;
      font-weight: 600;
      font-size: 15px;
    }

    .warning strong {
      color: #f59e42;
      font-weight: 700;
      font-size: 16px;
    }

    .filters {
      margin-bottom: 20px;
    }

    input[type="text"] {
      width: 300px;
      padding: 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--vscode-editor-background);
    }

    thead {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      position: sticky;
      top: 0;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid var(--vscode-panel-border);
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    tr:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .reason {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

    .open-btn {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 12px;
    }

    .open-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .no-results {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>React Compiler Report</h1>
    <button class="rescan-btn" onclick="rescanWorkspace()">
      <span>↻</span>
      <span>Rescan</span>
    </button>
  </div>

  <div class="summary">
    ${summary}
  </div>

  ${
    components.length > 0
      ? `
  <div class="filters">
    <input
      type="text"
      id="searchInput"
      placeholder="Filter by component name, file, or reason..."
      onkeyup="filterTable()"
    />
  </div>

  <table id="componentsTable">
    <thead>
      <tr>
        <th onclick="sortTable(0)">Component ▼</th>
        <th onclick="sortTable(1)">File ▼</th>
        <th onclick="sortTable(2)">Line ▼</th>
        <th onclick="sortTable(3)">Reason ▼</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  `
      : '<div class="no-results">No unoptimized components found!</div>'
  }

  <script>
    const vscode = acquireVsCodeApi();

    function openComponent(index) {
      vscode.postMessage({
        command: 'openComponent',
        index: index
      });
    }

    function rescanWorkspace() {
      const btn = document.querySelector('.rescan-btn');

      // Show loading state (will stay until page refreshes with new data)
      btn.disabled = true;
      btn.classList.add('loading');
      btn.innerHTML = '<span>⟳</span><span>Scanning...</span>';

      vscode.postMessage({
        command: 'rescan'
      });

      // Don't reset - let the page refresh handle it when scan completes
    }

    function filterTable() {
      const input = document.getElementById('searchInput');
      const filter = input.value.toLowerCase();
      const table = document.getElementById('componentsTable');
      const tbody = table.getElementsByTagName('tbody')[0];
      const rows = tbody.getElementsByTagName('tr');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.textContent || row.innerText;
        row.style.display = text.toLowerCase().includes(filter) ? '' : 'none';
      }
    }

    let sortDirection = {};

    function sortTable(columnIndex) {
      const table = document.getElementById('componentsTable');
      const tbody = table.getElementsByTagName('tbody')[0];
      const rows = Array.from(tbody.getElementsByTagName('tr'));

      const isNumeric = columnIndex === 2;
      const direction = sortDirection[columnIndex] === 'asc' ? 'desc' : 'asc';
      sortDirection[columnIndex] = direction;

      rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();

        let comparison = 0;
        if (isNumeric) {
          comparison = parseInt(aValue) - parseInt(bValue);
        } else {
          comparison = aValue.localeCompare(bValue);
        }

        return direction === 'asc' ? comparison : -comparison;
      });

      rows.forEach(row => tbody.appendChild(row));
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
