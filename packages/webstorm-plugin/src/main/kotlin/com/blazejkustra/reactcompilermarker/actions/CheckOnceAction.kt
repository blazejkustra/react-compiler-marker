package com.blazejkustra.reactcompilermarker.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class CheckOnceAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.dataContext.getData(com.intellij.openapi.actionSystem.CommonDataKeys.EDITOR) ?: run {
            Messages.showInfoMessage(
                project,
                "Please open a file to check",
                "React Compiler Marker"
            )
            return
        }
        
        thisLogger().info("Check current file for React Compiler markers")
        
        // TODO: Implement check logic
        // - Get current file
        // - Send check command to LSP server
        // - Refresh inlay hints for current file
        
        Messages.showInfoMessage(
            project,
            "Checking current file for React Compiler markers...",
            "React Compiler Marker"
        )
    }
}


