package com.blazejkustra.reactcompilermarker

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class ReactCompilerMarkerStartupActivity : ProjectActivity {

    override suspend fun execute(project: Project) {
        thisLogger().info("React Compiler Marker extension initializing for project: ${project.name}")

        val settings = ReactCompilerMarkerSettings.getInstance(project)

        if (settings.isEnabled) {
            thisLogger().info("Extension is enabled, starting LSP server...")
            val lspManager = ReactCompilerLspServerManager.getInstance(project)
            lspManager.startServer()

            if (lspManager.isRunning) {
                // Send initial configuration to the server
                lspManager.updateConfiguration(settings.toMap())
                thisLogger().info("React Compiler Marker extension initialized successfully")
            } else {
                thisLogger().warn("Failed to start LSP server - extension will be available but markers won't show")
            }
        } else {
            thisLogger().info("Extension is disabled, skipping LSP server startup")
        }
    }
}

