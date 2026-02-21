package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.report.ReportToolWindow
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.google.gson.Gson
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class GenerateReportAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val lspManager = ReactCompilerLspServerManager.getInstance(project)

        if (!lspManager.isRunning) {
            Messages.showWarningDialog(
                project,
                "LSP server is not running. Please activate the extension first.",
                "React Compiler Marker"
            )
            return
        }

        val basePath = project.basePath
        if (basePath == null) {
            Messages.showErrorDialog(
                project,
                "No project base path available.",
                "React Compiler Marker"
            )
            return
        }

        val settings = ReactCompilerMarkerSettings.getInstance(project)
        val options = mapOf(
            "root" to basePath,
            "emojis" to mapOf(
                "success" to settings.successEmoji,
                "error" to settings.errorEmoji
            )
        )

        val future = lspManager.executeCommand("react-compiler-marker/generateReportHtml", options)

        if (future == null) {
            Messages.showWarningDialog(
                project,
                "Failed to request report generation.",
                "React Compiler Marker"
            )
            return
        }

        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val result = future.get()
                val gson = Gson()
                val jsonResult = gson.toJsonTree(result).asJsonObject

                val success = jsonResult.get("success")?.asBoolean ?: false
                val html = jsonResult.get("html")?.asString

                ApplicationManager.getApplication().invokeLater {
                    if (success && html != null) {
                        ReportToolWindow.show(project, html)
                    } else {
                        val error = jsonResult.get("error")?.asString ?: "Unknown error"
                        Messages.showErrorDialog(
                            project,
                            error,
                            "React Compiler Marker"
                        )
                    }
                }
            } catch (ex: Exception) {
                thisLogger().error("Failed to generate report", ex)
                ApplicationManager.getApplication().invokeLater {
                    Messages.showErrorDialog(
                        project,
                        "Failed to generate report: ${ex.message}",
                        "React Compiler Marker"
                    )
                }
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val settings = project?.let { ReactCompilerMarkerSettings.getInstance(it) }
        e.presentation.isEnabled = settings?.isEnabled == true
    }
}
