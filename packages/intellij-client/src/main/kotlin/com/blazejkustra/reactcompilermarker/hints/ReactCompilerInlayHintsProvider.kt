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
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range
import javax.swing.JComponent
import javax.swing.JPanel

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
                            val presentation = factory.text(labelText)
                            val tooltipEither = hint.tooltip
                            val tooltip = tooltipEither?.let {
                                if (it.isLeft) {
                                    it.left
                                } else {
                                    it.right?.value
                                }
                            }

                            val finalPresentation = if (tooltip != null) {
                                factory.withTooltip(tooltip, presentation)
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
    }
}
