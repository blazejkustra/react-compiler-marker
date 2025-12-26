package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class CheckOnceAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.dataContext.getData(CommonDataKeys.EDITOR) ?: run {
            Messages.showInfoMessage(
                project,
                "Please open a file to check",
                "React Compiler Marker"
            )
            return
        }

        val psiFile = e.dataContext.getData(CommonDataKeys.PSI_FILE) ?: return

        thisLogger().info("Checking current file for React Compiler markers: ${psiFile.name}")

        val lspManager = ReactCompilerLspServerManager.getInstance(project)
        lspManager.executeCommand("react-compiler-marker/checkOnce")

        // Refresh code analysis to update inlay hints
        DaemonCodeAnalyzer.getInstance(project).restart(psiFile)

        Messages.showInfoMessage(
            project,
            "Checked ${psiFile.name} for React Compiler markers",
            "React Compiler Marker"
        )
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

