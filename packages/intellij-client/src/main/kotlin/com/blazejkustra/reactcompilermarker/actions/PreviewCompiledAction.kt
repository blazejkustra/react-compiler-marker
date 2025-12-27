package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.google.gson.Gson
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFileFactory
import com.intellij.psi.codeStyle.CodeStyleManager
import com.intellij.testFramework.LightVirtualFile

class PreviewCompiledAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.dataContext.getData(CommonDataKeys.EDITOR) ?: run {
            Messages.showInfoMessage(
                project,
                "Please open a file to preview compiled output",
                "React Compiler Marker"
            )
            return
        }

        val virtualFile = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        val psiFile = e.dataContext.getData(CommonDataKeys.PSI_FILE) ?: return

        thisLogger().info("Previewing compiled output for: ${psiFile.name}")

        val lspManager = ReactCompilerLspServerManager.getInstance(project)

        if (!lspManager.isRunning) {
            Messages.showWarningDialog(
                project,
                "LSP server is not running. Please activate the extension first.",
                "React Compiler Marker"
            )
            return
        }

        val fileUri = "file://${virtualFile.path}"
        val documentText = editor.document.text
        val languageId = getLanguageId(virtualFile.name)

        // Send didOpen to ensure the server has the document
        lspManager.didOpen(fileUri, languageId, 1, documentText)

        val future = lspManager.executeCommand("react-compiler-marker/getCompiledOutput", fileUri)

        if (future == null) {
            Messages.showWarningDialog(
                project,
                "Failed to request compiled output",
                "React Compiler Marker"
            )
            return
        }

        // Execute asynchronously to avoid blocking the UI
        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val result = future.get()
                val gson = Gson()
                val jsonResult = gson.toJsonTree(result).asJsonObject

                val success = jsonResult.get("success")?.asBoolean ?: false
                val code = jsonResult.get("code")?.asString
                val error = jsonResult.get("error")?.asString

                ApplicationManager.getApplication().invokeLater {
                    if (success && code != null) {
                        // Create a virtual file with the compiled output
                        val compiledFileName = "${psiFile.name.substringBeforeLast(".")}.compiled.${psiFile.name.substringAfterLast(".")}"

                        // Format the code before displaying
                        val formattedCode = formatCode(project, code, compiledFileName)
                        val compiledFile = LightVirtualFile(compiledFileName, formattedCode)

                        // Open the compiled file in a new editor tab
                        FileEditorManager.getInstance(project).openFile(compiledFile, true)
                    } else {
                        Messages.showErrorDialog(
                            project,
                            error ?: "Unknown error during compilation",
                            "React Compiler Marker"
                        )
                    }
                }
            } catch (ex: Exception) {
                thisLogger().error("Failed to get compiled output", ex)
                ApplicationManager.getApplication().invokeLater {
                    Messages.showErrorDialog(
                        project,
                        "Failed to get compiled output: ${ex.message}",
                        "React Compiler Marker"
                    )
                }
            }
        }
    }

    private fun getLanguageId(fileName: String): String {
        return when {
            fileName.endsWith(".tsx") -> "typescriptreact"
            fileName.endsWith(".ts") -> "typescript"
            fileName.endsWith(".jsx") -> "javascriptreact"
            fileName.endsWith(".js") -> "javascript"
            else -> "javascript"
        }
    }

    private fun formatCode(project: Project, code: String, fileName: String): String {
        return try {
            val extension = fileName.substringAfterLast(".", "js")
            val fileType = FileTypeManager.getInstance().getFileTypeByExtension(extension)

            val psiFile = PsiFileFactory.getInstance(project)
                .createFileFromText(fileName, fileType, code)

            WriteCommandAction.runWriteCommandAction(project) {
                CodeStyleManager.getInstance(project).reformat(psiFile)
            }

            psiFile.text
        } catch (e: Exception) {
            thisLogger().warn("Failed to format code, returning original", e)
            code
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val editor = e.dataContext.getData(CommonDataKeys.EDITOR)
        val psiFile = e.dataContext.getData(CommonDataKeys.PSI_FILE)

        val isReactFile = psiFile?.name?.let { name ->
            name.endsWith(".js") || name.endsWith(".jsx") ||
            name.endsWith(".ts") || name.endsWith(".tsx")
        } ?: false

        val settings = project?.let { ReactCompilerMarkerSettings.getInstance(it) }
        e.presentation.isEnabled = editor != null && isReactFile && settings?.isEnabled == true
    }
}
