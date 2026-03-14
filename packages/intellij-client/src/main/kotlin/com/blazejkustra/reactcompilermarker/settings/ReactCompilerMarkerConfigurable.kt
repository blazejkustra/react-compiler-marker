package com.blazejkustra.reactcompilermarker.settings

import com.blazejkustra.reactcompilermarker.lsp.ReactCompilerLspServerManager
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

class ReactCompilerMarkerConfigurable(private val project: Project) : Configurable {

    private var enabledCheckbox: JBCheckBox? = null
    private var successEmojiField: JBTextField? = null
    private var errorEmojiField: JBTextField? = null
    private var babelPluginPathField: JBTextField? = null
    private var excludedDirectoriesField: JBTextField? = null
    private var supportedExtensionsField: JBTextField? = null
    private var respectGitignoreCheckbox: JBCheckBox? = null

    override fun getDisplayName(): String = "React Compiler Marker"

    override fun createComponent(): JComponent {
        enabledCheckbox = JBCheckBox("Enable React Compiler Marker")
        successEmojiField = JBTextField()
        errorEmojiField = JBTextField()
        babelPluginPathField = JBTextField()
        excludedDirectoriesField = JBTextField()
        supportedExtensionsField = JBTextField()
        respectGitignoreCheckbox = JBCheckBox("Respect .gitignore rules when scanning")

        return FormBuilder.createFormBuilder()
            .addComponent(enabledCheckbox!!)
            .addSeparator()
            .addLabeledComponent(JBLabel("Success emoji:"), successEmojiField!!, 1, false)
            .addLabeledComponent(JBLabel("Error emoji:"), errorEmojiField!!, 1, false)
            .addSeparator()
            .addLabeledComponent(JBLabel("Babel plugin path:"), babelPluginPathField!!, 1, false)
            .addSeparator()
            .addLabeledComponent(JBLabel("Excluded directories (comma-separated):"), excludedDirectoriesField!!, 1, false)
            .addLabeledComponent(JBLabel("Supported extensions (comma-separated):"), supportedExtensionsField!!, 1, false)
            .addSeparator()
            .addComponent(respectGitignoreCheckbox!!)
            .addComponentFillVertically(JPanel(), 0)
            .panel
    }

    override fun isModified(): Boolean {
        val settings = ReactCompilerMarkerSettings.getInstance(project)
        return enabledCheckbox?.isSelected != settings.isEnabled ||
               successEmojiField?.text != settings.successEmoji ||
               errorEmojiField?.text != settings.errorEmoji ||
               babelPluginPathField?.text != settings.babelPluginPath ||
               excludedDirectoriesField?.text != settings.excludedDirectories ||
               supportedExtensionsField?.text != settings.supportedExtensions ||
               respectGitignoreCheckbox?.isSelected != settings.respectGitignore
    }

    override fun apply() {
        val settings = ReactCompilerMarkerSettings.getInstance(project)
        settings.isEnabled = enabledCheckbox?.isSelected ?: true
        settings.successEmoji = successEmojiField?.text ?: "\u2728"
        settings.errorEmoji = errorEmojiField?.text ?: "\uD83D\uDEAB"
        settings.babelPluginPath = babelPluginPathField?.text ?: "node_modules/babel-plugin-react-compiler"
        settings.excludedDirectories = excludedDirectoriesField?.text ?: ""
        settings.supportedExtensions = supportedExtensionsField?.text ?: ""
        settings.respectGitignore = respectGitignoreCheckbox?.isSelected ?: true

        // Update LSP server configuration
        val lspManager = ReactCompilerLspServerManager.getInstance(project)
        lspManager.updateConfiguration(settings.toMap())
    }

    override fun reset() {
        val settings = ReactCompilerMarkerSettings.getInstance(project)
        enabledCheckbox?.isSelected = settings.isEnabled
        successEmojiField?.text = settings.successEmoji
        errorEmojiField?.text = settings.errorEmoji
        babelPluginPathField?.text = settings.babelPluginPath
        excludedDirectoriesField?.text = settings.excludedDirectories
        supportedExtensionsField?.text = settings.supportedExtensions
        respectGitignoreCheckbox?.isSelected = settings.respectGitignore
    }

    override fun disposeUIResources() {
        enabledCheckbox = null
        successEmojiField = null
        errorEmojiField = null
        babelPluginPathField = null
        excludedDirectoriesField = null
        supportedExtensionsField = null
        respectGitignoreCheckbox = null
    }
}
