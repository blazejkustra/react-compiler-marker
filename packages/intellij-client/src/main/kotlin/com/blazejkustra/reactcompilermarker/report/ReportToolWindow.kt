package com.blazejkustra.reactcompilermarker.report

import com.google.gson.Gson
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowAnchor
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.io.File

class ReportToolWindow private constructor(
    private val project: Project,
    private val html: String
) {
    companion object {
        private const val TOOL_WINDOW_ID = "React Compiler Report"

        fun show(project: Project, html: String) {
            if (!JBCefApp.isSupported()) {
                thisLogger().warn("JCEF is not supported, falling back to system browser")
                showInBrowser(html)
                return
            }

            val reportWindow = ReportToolWindow(project, html)
            reportWindow.createAndShow()
        }

        private fun showInBrowser(html: String) {
            try {
                val tempFile = File.createTempFile("rcm-report-", ".html")
                tempFile.deleteOnExit()
                tempFile.writeText(html)
                java.awt.Desktop.getDesktop().browse(tempFile.toURI())
            } catch (e: Exception) {
                thisLogger().error("Failed to open report in browser", e)
            }
        }
    }

    private fun createAndShow() {
        val toolWindowManager = ToolWindowManager.getInstance(project)

        // Unregister existing tool window if present
        toolWindowManager.getToolWindow(TOOL_WINDOW_ID)?.let {
            toolWindowManager.unregisterToolWindow(TOOL_WINDOW_ID)
        }

        val toolWindow = toolWindowManager.registerToolWindow(TOOL_WINDOW_ID) {
            anchor = ToolWindowAnchor.RIGHT
            canCloseContent = true
        }

        val browser = JBCefBrowser()
        val openFileQuery = JBCefJSQuery.create(browser)

        openFileQuery.addHandler { arg ->
            try {
                val gson = Gson()
                val message = gson.fromJson(arg, OpenFileMessage::class.java)
                if (message?.type == "openFile" && message.path != null) {
                    ApplicationManager.getApplication().invokeLater {
                        openFileInEditor(project, message.path, message.line, message.column)
                    }
                }
            } catch (e: Exception) {
                thisLogger().error("Failed to handle openFile message", e)
            }
            null
        }

        // Inject the ideBridge script after page loads
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(cefBrowser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (frame.isMain) {
                    val bridgeScript = """
                        window.ideBridge = {
                            postMessage: function(msg) {
                                ${openFileQuery.inject("JSON.stringify(msg)")}
                            },
                            getState: function() {
                                try { return JSON.parse(sessionStorage.getItem('rcm-state') || '{}'); }
                                catch(e) { return {}; }
                            },
                            setState: function(s) {
                                try { sessionStorage.setItem('rcm-state', JSON.stringify(s)); }
                                catch(e) {}
                            }
                        };
                    """.trimIndent()
                    cefBrowser.executeJavaScript(bridgeScript, cefBrowser.url, 0)
                }
            }
        }, browser.cefBrowser)

        browser.loadHTML(html)

        val content = ContentFactory.getInstance().createContent(browser.component, "", false)
        toolWindow.contentManager.addContent(content)
        toolWindow.show()
    }

    private fun openFileInEditor(project: Project, relativePath: String, line: Int?, column: Int?) {
        val basePath = project.basePath ?: return
        val absolutePath = File(basePath, relativePath).absolutePath
        val virtualFile = LocalFileSystem.getInstance().findFileByPath(absolutePath)

        if (virtualFile == null) {
            thisLogger().warn("File not found: $absolutePath")
            return
        }

        val targetLine = line ?: 0
        val targetColumn = column ?: 0
        val descriptor = OpenFileDescriptor(project, virtualFile, targetLine, targetColumn)
        FileEditorManager.getInstance(project).openTextEditor(descriptor, true)
    }

    private data class OpenFileMessage(
        val type: String?,
        val path: String?,
        val line: Int?,
        val column: Int?
    )
}
