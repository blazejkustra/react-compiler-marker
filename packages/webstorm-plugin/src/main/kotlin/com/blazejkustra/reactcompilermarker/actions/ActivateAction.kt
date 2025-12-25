package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class ActivateAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        thisLogger().info("Activating React Compiler Marker extension")

        val settings = ReactCompilerMarkerSettings.getInstance(project)
        settings.isEnabled = true

        val lspManager = ReactCompilerLspServerManager.getInstance(project)

        if (!lspManager.isRunning) {
            lspManager.startServer()
        }

        lspManager.executeCommand("react-compiler-marker/activate")

        // Refresh code analysis to update inlay hints
        DaemonCodeAnalyzer.getInstance(project).restart()

        Messages.showInfoMessage(
            project,
            "React Compiler Marker extension activated",
            "React Compiler Marker"
        )
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val settings = project?.let { ReactCompilerMarkerSettings.getInstance(it) }
        e.presentation.isEnabled = settings?.isEnabled != true
    }
}

