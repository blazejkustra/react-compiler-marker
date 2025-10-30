import * as vscode from "vscode";
import { UnoptimizedComponent } from "./workspaceScan";

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("reactCompiler");

export function showInProblemsPanel(
  components: UnoptimizedComponent[]
): void {
  diagnosticCollection.clear();

  if (components.length === 0) {
    vscode.window.showInformationMessage(
      "All components are optimized by React Compiler!"
    );
    return;
  }

  const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

  for (const component of components) {
    const uri = vscode.Uri.file(component.filePath);
    const filePath = uri.toString();

    if (!diagnosticsByFile.has(filePath)) {
      diagnosticsByFile.set(filePath, []);
    }

    const range = component.detailLocation
      ? new vscode.Range(
          component.detailLocation.startLine,
          component.detailLocation.startColumn,
          component.detailLocation.endLine,
          component.detailLocation.endColumn
        )
      : new vscode.Range(component.line, component.column, component.line, 100);

    const diagnostic = new vscode.Diagnostic(
      range,
      `Component '${component.componentName}' is not optimized by React Compiler: ${component.reason}`,
      vscode.DiagnosticSeverity.Warning
    );

    diagnostic.source = "React Compiler";
    diagnostic.code = "unoptimized-component";

    diagnosticsByFile.get(filePath)!.push(diagnostic);
  }

  for (const [filePath, diagnostics] of diagnosticsByFile) {
    diagnosticCollection.set(vscode.Uri.parse(filePath), diagnostics);
  }

  vscode.window.showInformationMessage(
    `Found ${components.length} unoptimized component${components.length === 1 ? "" : "s"}. Check the Problems panel.`
  );
}

export function clearProblemsPanel(): void {
  diagnosticCollection.clear();
}

