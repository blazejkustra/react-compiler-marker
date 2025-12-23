package com.blazejkustra.reactcompilermarker.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class DeactivateAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        thisLogger().info("Deactivate React Compiler Marker extension")
        
        // TODO: Implement deactivation logic
        // - Update settings to disable extension
        // - Send deactivation command to LSP server
        // - Clear inlay hints
        
        Messages.showInfoMessage(
            project,
            "React Compiler Marker extension deactivated",
            "React Compiler Marker"
        )
    }
}

