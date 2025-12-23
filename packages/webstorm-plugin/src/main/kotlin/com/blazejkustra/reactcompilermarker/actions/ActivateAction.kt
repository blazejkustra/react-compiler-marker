package com.blazejkustra.reactcompilermarker.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class ActivateAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        thisLogger().info("Activate React Compiler Marker extension")
        
        // TODO: Implement activation logic
        // - Update settings to enable extension
        // - Send activation command to LSP server
        // - Refresh inlay hints
        
        Messages.showInfoMessage(
            project,
            "React Compiler Marker extension activated",
            "React Compiler Marker"
        )
    }
}


