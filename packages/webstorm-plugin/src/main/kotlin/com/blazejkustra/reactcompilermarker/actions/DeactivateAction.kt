package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class DeactivateAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        thisLogger().info("Deactivating React Compiler Marker extension")

        val settings = ReactCompilerMarkerSettings.getInstance(project)
        settings.isEnabled = false

        val lspManager = ReactCompilerLspServerManager.getInstance(project)
        lspManager.executeCommand("react-compiler-marker/deactivate")

        // Refresh code analysis to clear inlay hints
        DaemonCodeAnalyzer.getInstance(project).restart()

        Messages.showInfoMessage(
            project,
            "React Compiler Marker extension deactivated",
            "React Compiler Marker"
        )
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val settings = project?.let { ReactCompilerMarkerSettings.getInstance(it) }
        e.presentation.isEnabled = settings?.isEnabled == true
    }
}

