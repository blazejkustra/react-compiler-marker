package com.blazejkustra.reactcompilermarker.hints

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.blazejkustra.reactcompilermarker.settings.ReactCompilerMarkerSettings
import com.intellij.codeInsight.hints.*
import com.intellij.codeInsight.hints.presentation.InlayPresentation
import com.intellij.codeInsight.hints.presentation.PresentationFactory
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.ui.popup.JBPopup
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.ui.awt.RelativePoint
import com.intellij.ui.components.JBHtmlPane
import com.intellij.util.ui.JBUI
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.vfs.LocalFileSystem
import com.google.gson.JsonParser
import java.awt.Point
import java.net.URLDecoder
import java.awt.event.MouseEvent
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.event.HyperlinkEvent
import javax.swing.event.HyperlinkListener

@Suppress("UnstableApiUsage")
class ReactCompilerInlayHintsProvider : InlayHintsProvider<NoSettings>, DumbAware {

    override val key: SettingsKey<NoSettings> = SettingsKey("react-compiler-marker.inlay.hints")
    override val name: String = "React Compiler Marker"
    override val previewText: String = """
        function MyComponent() {
            return <div>Hello World</div>;
        }
    """.trimIndent()

    override fun createSettings(): NoSettings = NoSettings()

    override fun createConfigurable(settings: NoSettings): ImmediateConfigurable {
        return object : ImmediateConfigurable {
            override fun createComponent(listener: ChangeListener): JComponent = JPanel()
        }
    }

    override fun getCollectorFor(
        file: PsiFile,
        editor: Editor,
        settings: NoSettings,
        sink: InlayHintsSink
    ): InlayHintsCollector? {
        val project = file.project
        val markerSettings = ReactCompilerMarkerSettings.getInstance(project)

        if (!markerSettings.isEnabled) {
            return null
        }

        val fileName = file.name
        if (!isReactFile(fileName)) {
            return null
        }

        return ReactCompilerInlayHintsCollector(editor)
    }

    private fun isReactFile(fileName: String): Boolean {
        return fileName.endsWith(".js") ||
               fileName.endsWith(".jsx") ||
               fileName.endsWith(".ts") ||
               fileName.endsWith(".tsx")
    }

    private class ReactCompilerInlayHintsCollector(editor: Editor) : FactoryInlayHintsCollector(editor) {

        // Track if we've already processed this file in this collection cycle
        private var hasProcessedFile = false

        override fun collect(element: PsiElement, editor: Editor, sink: InlayHintsSink): Boolean {
            val project = element.project
            val file = element.containingFile ?: return true
            val virtualFile = file.virtualFile ?: return true

            // Only process at file level to avoid duplicate processing
            if (element !== file) {
                return true
            }

            // Prevent duplicate processing within the same collector instance
            if (hasProcessedFile) {
                return true
            }
            hasProcessedFile = true

            thisLogger().info("Collecting inlay hints for: ${virtualFile.path}")

            val lspManager = ReactCompilerLspServerManager.getInstance(project)
            if (!lspManager.isRunning) {
                thisLogger().warn("LSP server not running, skipping inlay hints for ${virtualFile.name}")
                return true
            }

            val document = editor.document
            val lineCount = document.lineCount
            val fileUri = "file://${virtualFile.path}"
            val documentText = document.text
            val languageId = getLanguageId(file.name)

            // Always sync the document with the LSP server before requesting hints
            lspManager.didOpen(fileUri, languageId, 1, documentText)

            // Request inlay hints from the LSP server
            val range = Range(
                Position(0, 0),
                Position(lineCount, 0)
            )

            try {
                val hintsFuture = lspManager.getInlayHints(fileUri, range)
                if (hintsFuture == null) {
                    thisLogger().debug("Failed to request inlay hints")
                    return true
                }

                // Use a shorter timeout to avoid blocking the UI thread
                // The InlayHintsCollector runs on a background thread, but we still
                // want to be responsive
                val hints = hintsFuture.get(2, java.util.concurrent.TimeUnit.SECONDS)

                if (hints.isNullOrEmpty()) {
                    thisLogger().debug("No inlay hints returned from LSP server")
                    return true
                }

                thisLogger().info("Received ${hints.size} inlay hints from LSP server")

                for (hint in hints) {
                    val position = hint.position
                    val line = position.line
                    val character = position.character

                    // Convert LSP position to editor offset
                    if (line >= 0 && line < document.lineCount) {
                        val lineStartOffset = document.getLineStartOffset(line)
                        val lineEndOffset = document.getLineEndOffset(line)
                        val maxChar = lineEndOffset - lineStartOffset
                        val actualChar = character.coerceAtMost(maxChar)
                        val offset = lineStartOffset + actualChar

                        // Extract the label text from the hint
                        val label = hint.label
                        val labelText = if (label.isLeft) {
                            label.left
                        } else {
                            label.right?.joinToString("") { it.value ?: "" } ?: ""
                        }

                        if (labelText.isNotEmpty()) {
                            val basePresentation = factory.text(labelText)
                            val presentation = factory.inset(basePresentation, top = 4, left = 0, down = 0, right = 0)
                            val tooltipEither = hint.tooltip
                            val tooltip = tooltipEither?.let {
                                if (it.isLeft) {
                                    it.left
                                } else {
                                    it.right?.value
                                }
                            }

                            val finalPresentation = if (tooltip != null) {
                                // Use onHover with JBPopup for a tooltip that can be hovered over
                                createHoverableTooltipPresentation(factory, presentation, tooltip, editor)
                            } else {
                                presentation
                            }

                            sink.addInlineElement(offset, false, finalPresentation, false)
                        }
                    }
                }
            } catch (e: java.util.concurrent.TimeoutException) {
                thisLogger().warn("Timeout waiting for inlay hints from LSP server")
            } catch (e: Exception) {
                thisLogger().warn("Error getting inlay hints from LSP server", e)
            }

            return true
        }

        private fun getLanguageId(fileName: String): String {
            return when {
                fileName.endsWith(".tsx") -> "typescriptreact"
                fileName.endsWith(".ts") -> "typescript"
                fileName.endsWith(".jsx") -> "javascriptreact"
                fileName.endsWith(".js") -> "javascript"
                else -> "javascript"
            }
        }

        private fun createHoverableTooltipPresentation(
            factory: PresentationFactory,
            base: InlayPresentation,
            tooltipText: String,
            editor: Editor
        ): InlayPresentation {
            var currentPopup: JBPopup? = null
            var isHoveringOverInlay = false

            return factory.onHover(base, object : InlayPresentationFactory.HoverListener {
                override fun onHover(event: MouseEvent, translated: Point) {
                    isHoveringOverInlay = true

                    // Don't open a new popup if one is already visible
                    val popup = currentPopup
                    if (popup != null && !popup.isDisposed && popup.isVisible) return

                    // Use JBHtmlPane for proper IntelliJ-styled HTML rendering
                    val maxWidth = 400
                    val maxHeight = 300

                    val htmlPane = JBHtmlPane().apply {
                        text = tooltipText
                        border = JBUI.Borders.empty(8, 12)
                        // Set a fixed width to allow proper height calculation
                        setSize(maxWidth, Short.MAX_VALUE.toInt())
                        addHyperlinkListener { event ->
                            if (event.eventType == HyperlinkEvent.EventType.ACTIVATED) {
                                val url = event.url?.toString() ?: event.description ?: return@addHyperlinkListener
                                handleHyperlinkClick(url, editor, currentPopup)
                            }
                        }
                    }

                    // Calculate actual preferred size after layout
                    val preferredWidth = minOf(maxWidth, htmlPane.preferredSize.width)
                    val preferredHeight = minOf(maxHeight, htmlPane.preferredSize.height)

                    // Wrap in scroll pane with calculated dimensions
                    val scrollPane = com.intellij.ui.components.JBScrollPane(htmlPane).apply {
                        border = null
                        preferredSize = java.awt.Dimension(preferredWidth, preferredHeight)
                        minimumSize = preferredSize
                        maximumSize = preferredSize
                    }

                    currentPopup = JBPopupFactory.getInstance()
                        .createComponentPopupBuilder(scrollPane, null)
                        .setResizable(false)
                        .setMovable(false)
                        .setRequestFocus(false)
                        .setCancelOnClickOutside(true)
                        .setCancelOnMouseOutCallback { _ ->
                            // Let onHoverFinished handle closing
                            false
                        }
                        .createPopup()

                    // Show popup below the line using screen coordinates
                    val screenPoint = event.locationOnScreen
                    val lineHeight = editor.lineHeight
                    // Position below the current line, accounting for where the mouse is within the line
                    val yInLine = event.y % lineHeight
                    val yOffset = lineHeight - yInLine + 2
                    val point = RelativePoint(Point(screenPoint.x, screenPoint.y + yOffset))
                    currentPopup?.show(point)
                }

                override fun onHoverFinished() {
                    isHoveringOverInlay = false

                    // Delay to allow mouse to move to popup
                    java.util.Timer().schedule(object : java.util.TimerTask() {
                        override fun run() {
                            ApplicationManager.getApplication().invokeLater {
                                // Don't close if mouse moved back to inlay
                                if (isHoveringOverInlay) return@invokeLater

                                val popup = currentPopup ?: return@invokeLater
                                if (popup.isDisposed) {
                                    currentPopup = null
                                    return@invokeLater
                                }

                                // Check if mouse is over the popup
                                val mousePos = java.awt.MouseInfo.getPointerInfo()?.location
                                if (mousePos != null && popup.content.isShowing) {
                                    val popupBounds = popup.content.bounds
                                    popupBounds.location = popup.content.locationOnScreen
                                    if (!popupBounds.contains(mousePos)) {
                                        popup.cancel()
                                        currentPopup = null
                                    }
                                }
                            }
                        }
                    }, 100) // 100ms delay
                }
            })
        }

        private fun handleHyperlinkClick(url: String, editor: Editor, popup: JBPopup?) {
            when {
                url.startsWith("command:react-compiler-marker.revealSelection?") -> {
                    // Parse the JSON params from the command URL
                    val paramsJson = URLDecoder.decode(
                        url.substringAfter("command:react-compiler-marker.revealSelection?"),
                        "UTF-8"
                    )
                    try {
                        val params = JsonParser.parseString(paramsJson).asJsonObject
                        val start = params.getAsJsonObject("start")
                        val startLine = start.get("line").asInt
                        val startChar = start.get("character").asInt

                        // Navigate to the line in the editor
                        ApplicationManager.getApplication().invokeLater {
                            val logicalPosition = LogicalPosition(startLine, startChar)
                            editor.caretModel.moveToLogicalPosition(logicalPosition)
                            editor.scrollingModel.scrollToCaret(ScrollType.CENTER)

                            // Select the range if end position is provided
                            val end = params.getAsJsonObject("end")
                            if (end != null) {
                                val endLine = end.get("line").asInt
                                val endChar = end.get("character").asInt
                                val startOffset = editor.logicalPositionToOffset(LogicalPosition(startLine, startChar))
                                val endOffset = editor.logicalPositionToOffset(LogicalPosition(endLine, endChar))
                                editor.selectionModel.setSelection(startOffset, endOffset)
                            }

                            popup?.cancel()
                        }
                    } catch (e: Exception) {
                        thisLogger().warn("Failed to parse revealSelection command", e)
                    }
                }
                url.startsWith("command:react-compiler-marker.fixWithAI?") -> {
                    // TODO: Implement Fix with AI functionality for IntelliJ
                    thisLogger().info("Fix with AI clicked - not yet implemented for IntelliJ")
                    popup?.cancel()
                }
                url.startsWith("command:react-compiler-marker.previewCompiled") -> {
                    popup?.cancel()
                    ApplicationManager.getApplication().invokeLater {
                        val action = ActionManager.getInstance().getAction("ReactCompilerMarker.PreviewCompiled")
                        if (action != null) {
                            val dataContext = SimpleDataContext.builder()
                                .add(CommonDataKeys.PROJECT, editor.project)
                                .add(CommonDataKeys.EDITOR, editor)
                                .add(CommonDataKeys.VIRTUAL_FILE, editor.virtualFile)
                                .build()
                            val event = AnActionEvent.createFromAnAction(action, null, "ReactCompilerInlayHint", dataContext)
                            action.actionPerformed(event)
                        } else {
                            thisLogger().warn("PreviewCompiled action not found")
                        }
                    }
                }
                url.startsWith("http://") || url.startsWith("https://") -> {
                    BrowserUtil.browse(url)
                }
                else -> {
                    thisLogger().debug("Unknown link type: $url")
                }
            }
        }

    }
}
