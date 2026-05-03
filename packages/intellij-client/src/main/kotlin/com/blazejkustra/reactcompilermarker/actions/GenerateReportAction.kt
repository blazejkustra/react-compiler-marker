package com.blazejkustra.reactcompilermarker.actions

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.report.ReportToolWindow
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.google.gson.Gson
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.ui.Messages
import com.intellij.util.ui.UIUtil
import java.awt.Color
import javax.swing.UIManager

class GenerateReportAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val lspManager = ReactCompilerLspServerManager.getInstance(project)

        if (!lspManager.isRunning) {
            Messages.showWarningDialog(
                project,
                "LSP server is not running. Please activate the extension first.",
                "React Compiler Marker"
            )
            return
        }

        val basePath = project.basePath
        if (basePath == null) {
            Messages.showErrorDialog(
                project,
                "No project base path available.",
                "React Compiler Marker"
            )
            return
        }

        val settings = ReactCompilerMarkerSettings.getInstance(project)
        val headExtra = buildThemeHeadExtra()
        val options = mapOf(
            "root" to basePath,
            "headExtra" to headExtra,
            "excludeDirs" to settings.excludedDirectoriesList,
            "includeExtensions" to settings.supportedExtensionsList,
            "respectGitignore" to settings.respectGitignore,
            "compilationMode" to settings.compilationMode,
            "emojis" to mapOf(
                "success" to settings.successEmoji,
                "error" to settings.errorEmoji,
                "skipped" to settings.skippedEmoji
            )
        )

        val future = lspManager.executeCommand("react-compiler-marker/generateReportHtml", options)

        if (future == null) {
            Messages.showWarningDialog(
                project,
                "Failed to request report generation.",
                "React Compiler Marker"
            )
            return
        }

        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val result = future.get()
                val gson = Gson()
                val jsonResult = gson.toJsonTree(result).asJsonObject

                val success = jsonResult.get("success")?.asBoolean ?: false
                val html = jsonResult.get("html")?.asString

                ApplicationManager.getApplication().invokeLater {
                    if (success && html != null) {
                        ReportToolWindow.show(project, html)
                    } else {
                        val error = jsonResult.get("error")?.asString ?: "Unknown error"
                        Messages.showErrorDialog(
                            project,
                            error,
                            "React Compiler Marker"
                        )
                    }
                }
            } catch (ex: Exception) {
                thisLogger().error("Failed to generate report", ex)
                ApplicationManager.getApplication().invokeLater {
                    Messages.showErrorDialog(
                        project,
                        "Failed to generate report: ${ex.message}",
                        "React Compiler Marker"
                    )
                }
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val settings = project?.let { ReactCompilerMarkerSettings.getInstance(it) }
        e.presentation.isEnabled = settings?.isEnabled == true
    }

    private fun buildThemeHeadExtra(): String {
        fun colorToCss(c: Color): String = "rgb(${c.red}, ${c.green}, ${c.blue})"
        fun colorToCssAlpha(c: Color, alpha: Double): String =
            "rgba(${c.red}, ${c.green}, ${c.blue}, $alpha)"

        val bg = UIManager.getColor("Panel.background") ?: UIUtil.getPanelBackground()
        val fg = UIManager.getColor("Label.foreground") ?: UIUtil.getLabelForeground()
        val border = UIManager.getColor("Borders.color") ?: UIManager.getColor("Component.borderColor") ?: bg
        val inputBg = UIManager.getColor("TextField.background") ?: bg
        val inputFg = UIManager.getColor("TextField.foreground") ?: fg
        val inputBorder = UIManager.getColor("Component.borderColor") ?: border
        val inputPlaceholder = UIManager.getColor("Component.infoForeground") ?: fg
        val buttonBg = UIManager.getColor("Button.default.startBackground") ?: UIManager.getColor("Button.startBackground") ?: bg
        val buttonFg = UIManager.getColor("Button.foreground") ?: fg

        // Use readable text colors based on theme brightness
        val isDark = (bg.red * 0.299 + bg.green * 0.587 + bg.blue * 0.114) < 128

        // Derive hover colors by shifting brightness
        fun shiftColor(c: Color, amount: Int): Color = Color(
            (c.red + amount).coerceIn(0, 255),
            (c.green + amount).coerceIn(0, 255),
            (c.blue + amount).coerceIn(0, 255)
        )
        val shift = if (isDark) 20 else -20
        val buttonHoverBg = shiftColor(buttonBg, shift)
        val listHoverBg = shiftColor(bg, shift)
        val success = if (isDark) Color(0x73, 0xC9, 0x91) else Color(0x2E, 0x7D, 0x32)
        val failed = if (isDark) Color(0xF4, 0x87, 0x71) else Color(0xC6, 0x28, 0x28)
        val skipped = if (isDark) Color(0xB0, 0xB7, 0xC2) else Color(0x5F, 0x66, 0x73)
        val fontFamily = UIManager.getFont("Label.font")?.family ?: "sans-serif"
        val fontSize = UIManager.getFont("Label.font")?.size ?: 13
        val editorFont = UIManager.getFont("EditorPane.font")?.family ?: "monospace"
        val editorFontSize = UIManager.getFont("EditorPane.font")?.size ?: 13

        return """
            <style>
              html {
                --rcm-bg: ${colorToCss(bg)};
                --rcm-foreground: ${colorToCss(fg)};
                --rcm-border: ${colorToCss(border)};
                --rcm-input-bg: ${colorToCss(inputBg)};
                --rcm-input-fg: ${colorToCss(inputFg)};
                --rcm-input-border: ${colorToCss(inputBorder)};
                --rcm-input-placeholder: ${colorToCss(inputPlaceholder)};
                --rcm-button-bg: ${colorToCss(buttonBg)};
                --rcm-button-fg: ${colorToCss(buttonFg)};
                --rcm-button-hover-bg: ${colorToCss(buttonHoverBg)};
                --rcm-list-hover-bg: ${colorToCssAlpha(listHoverBg, 0.5)};
                --rcm-success: ${colorToCss(success)};
                --rcm-failed: ${colorToCss(failed)};
                --rcm-skipped: ${colorToCss(skipped)};
                --rcm-font-family: '${fontFamily}', sans-serif;
                --rcm-font-size: ${fontSize}px;
                --rcm-editor-font-family: '${editorFont}', monospace;
                --rcm-editor-font-size: ${editorFontSize}px;
              }
            </style>
        """.trimIndent()
    }
}
