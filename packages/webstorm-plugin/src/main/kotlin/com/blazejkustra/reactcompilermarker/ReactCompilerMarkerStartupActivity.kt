package com.blazejkustra.reactcompilermarker

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class ReactCompilerMarkerStartupActivity : ProjectActivity {

    override suspend fun execute(project: Project) {
        thisLogger().info("React Compiler Marker extension initialized for project: ${project.name}")
    }
}

