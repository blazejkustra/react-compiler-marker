package com.blazejkustra.reactcompilermarker.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages

class PreviewCompiledAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.dataContext.getData(com.intellij.openapi.actionSystem.CommonDataKeys.EDITOR) ?: run {
            Messages.showInfoMessage(
                project,
                "Please open a file to preview compiled output",
                "React Compiler Marker"
            )
            return
        }
        
        thisLogger().info("Preview compiled output for current file")
        
        // TODO: Implement preview logic
        // - Get current file
        // - Send getCompiledOutput command to LSP server
        // - Open result in a new editor tab
        // - Show errors if compilation fails
        
        Messages.showInfoMessage(
            project,
            "Preview compiled output feature coming soon",
            "React Compiler Marker"
        )
    }
}


