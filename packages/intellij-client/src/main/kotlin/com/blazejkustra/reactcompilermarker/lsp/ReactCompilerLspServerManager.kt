package com.blazejkustra.reactcompilermarker.lsp

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.launch.LSPLauncher
import org.eclipse.lsp4j.services.LanguageServer
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

@Service(Service.Level.PROJECT)
class ReactCompilerLspServerManager(private val project: Project) : Disposable {
    private var process: Process? = null
    private var languageServer: LanguageServer? = null
    private var launcher: Launcher<LanguageServer>? = null
    private var initialized = false
    private var extractedServerPath: File? = null

    // Track open documents and their versions + content hash
    private data class DocumentState(val version: Int, val contentHash: Int)
    private val openDocuments = mutableMapOf<String, DocumentState>()


    val isRunning: Boolean
        get() = process?.isAlive == true && initialized

    fun startServer() {
        if (isRunning) {
            thisLogger().info("LSP server already running")
            return
        }

        val serverPath = findServerPath() ?: run {
            thisLogger().warn("Could not find LSP server. The server bundle may be missing.")
            return
        }

        thisLogger().info("Starting LSP server from: $serverPath")

        try {
            val nodePath = findNodePath()
            thisLogger().info("Using Node.js from: $nodePath")

            val processBuilder = ProcessBuilder(nodePath, serverPath, "--stdio")
                .directory(File(project.basePath ?: "."))
                .redirectErrorStream(false)

            process = processBuilder.start()

            // Start a thread to read and log stderr
            Thread {
                process!!.errorStream.bufferedReader().use { reader ->
                    reader.lineSequence().forEach { line ->
                        thisLogger().warn("LSP Server stderr: $line")
                    }
                }
            }.apply {
                isDaemon = true
                name = "LSP-Server-Stderr-Reader"
                start()
            }

            val inputStream = process!!.inputStream
            val outputStream = process!!.outputStream

            launcher = LSPLauncher.createClientLauncher(
                ReactCompilerLanguageClient(),
                inputStream,
                outputStream
            )

            languageServer = launcher!!.remoteProxy
            launcher!!.startListening()

            // Initialize the server
            val initParams = InitializeParams().apply {
                processId = ProcessHandle.current().pid().toInt()
                @Suppress("DEPRECATION")
                rootUri = project.basePath?.let { "file://$it" }
                workspaceFolders = project.basePath?.let {
                    listOf(WorkspaceFolder("file://$it", project.name))
                }
                capabilities = ClientCapabilities().apply {
                    textDocument = TextDocumentClientCapabilities().apply {
                        inlayHint = InlayHintCapabilities()
                    }
                }
                val pluginVersion = PluginManagerCore.getPlugin(PluginId.getId("com.blazejkustra.reactcompilermarker"))?.version ?: "unknown"
                clientInfo = ClientInfo("WebStorm React Compiler Marker", pluginVersion)
                // Request HTML format for tooltips (IntelliJ renders HTML, not markdown)
                initializationOptions = mapOf("tooltipFormat" to "html")
            }

            val initResult = languageServer!!.initialize(initParams).get(10, TimeUnit.SECONDS)
            thisLogger().info("LSP server initialized: ${initResult.serverInfo?.name} ${initResult.serverInfo?.version}")

            languageServer!!.initialized(InitializedParams())
            initialized = true

            thisLogger().info("LSP server started successfully")
        } catch (e: Exception) {
            thisLogger().error("Failed to start LSP server", e)
            stopServer()
        }
    }

    fun stopServer() {
        thisLogger().info("Stopping LSP server")
        initialized = false
        openDocuments.clear()

        try {
            languageServer?.shutdown()?.get(5, TimeUnit.SECONDS)
            languageServer?.exit()
        } catch (e: Exception) {
            thisLogger().warn("Error during LSP server shutdown", e)
        }

        process?.destroyForcibly()
        process = null
        languageServer = null
        launcher = null
    }

    fun executeCommand(command: String, vararg args: Any): CompletableFuture<Any>? {
        if (!isRunning) {
            thisLogger().warn("LSP server not running, cannot execute command: $command")
            return null
        }

        val params = ExecuteCommandParams(command, args.toList())
        return languageServer?.workspaceService?.executeCommand(params)
    }

    fun getInlayHints(uri: String, range: Range): CompletableFuture<List<InlayHint>>? {
        if (!isRunning) {
            thisLogger().warn("LSP server not running, cannot get inlay hints")
            return null
        }

        val params = InlayHintParams(
            TextDocumentIdentifier(uri),
            range
        )

        return languageServer?.textDocumentService?.inlayHint(params)
    }

    fun didOpen(uri: String, languageId: String, version: Int, text: String) {
        if (!isRunning) return

        val contentHash = text.hashCode()
        val existingState = openDocuments[uri]

        if (existingState != null) {
            // Document already open - check if content changed
            if (existingState.contentHash == contentHash) {
                // Content unchanged, no need to notify server
                return
            }
            // Content changed, send didChange instead
            val newVersion = existingState.version + 1
            openDocuments[uri] = DocumentState(newVersion, contentHash)
            didChange(uri, newVersion, text)
        } else {
            // New document, send didOpen
            openDocuments[uri] = DocumentState(version, contentHash)
            val params = DidOpenTextDocumentParams(
                TextDocumentItem(uri, languageId, version, text)
            )
            languageServer?.textDocumentService?.didOpen(params)
        }
    }

    fun didChange(uri: String, version: Int, text: String) {
        if (!isRunning) return

        val params = DidChangeTextDocumentParams(
            VersionedTextDocumentIdentifier(uri, version),
            listOf(TextDocumentContentChangeEvent(text))
        )
        languageServer?.textDocumentService?.didChange(params)
    }

    fun didClose(uri: String) {
        if (!isRunning) return

        openDocuments.remove(uri)
        val params = DidCloseTextDocumentParams(TextDocumentIdentifier(uri))
        languageServer?.textDocumentService?.didClose(params)
    }

    fun updateConfiguration(settings: Map<String, Any?>) {
        if (!isRunning) return

        val configParams = DidChangeConfigurationParams(
            mapOf("reactCompilerMarker" to settings)
        )
        languageServer?.workspaceService?.didChangeConfiguration(configParams)
    }

    private fun findServerPath(): String? {
        // First, try to extract the bundled server from plugin resources
        val bundledServer = extractBundledServer()
        if (bundledServer != null) {
            return bundledServer
        }

        // Fallback: check external locations for development
        val basePath = project.basePath
        if (basePath != null) {
            val devPaths = listOf(
                "$basePath/packages/server/out/server.js",
                "$basePath/../server/out/server.js",
            )

            for (path in devPaths) {
                val file = File(path)
                if (file.exists()) {
                    thisLogger().info("Found development LSP server at: ${file.absolutePath}")
                    return file.absolutePath
                }
            }
        }

        thisLogger().warn("LSP server not found")
        return null
    }

    private fun extractBundledServer(): String? {
        // Check if we already extracted it
        extractedServerPath?.let {
            if (it.exists()) {
                return it.absolutePath
            }
        }

        try {
            // Try to load the bundled server from plugin resources
            val resourceStream = this::class.java.getResourceAsStream("/server/server.bundle.js")
            if (resourceStream == null) {
                thisLogger().debug("Bundled server not found in resources")
                return null
            }

            // Create a temp directory for the server
            val tempDir = Files.createTempDirectory("react-compiler-marker-lsp").toFile()
            tempDir.deleteOnExit()

            val serverFile = File(tempDir, "server.bundle.js")
            serverFile.deleteOnExit()

            // Extract the server
            resourceStream.use { input ->
                FileOutputStream(serverFile).use { output ->
                    input.copyTo(output)
                }
            }

            extractedServerPath = serverFile
            thisLogger().info("Extracted bundled LSP server to: ${serverFile.absolutePath}")
            return serverFile.absolutePath

        } catch (e: Exception) {
            thisLogger().warn("Failed to extract bundled server", e)
            return null
        }
    }

    private fun findNodePath(): String {
        // Try common node locations
        val possiblePaths = listOf(
            "/opt/homebrew/bin/node",  // macOS Apple Silicon (Homebrew)
            "/usr/local/bin/node",      // macOS Intel (Homebrew) / Linux
            "/usr/bin/node",            // Linux system
            System.getenv("NVM_BIN")?.let { "$it/node" },  // nvm
            "node" // Fallback to PATH
        ).filterNotNull()

        for (path in possiblePaths) {
            if (path == "node") {
                // Check if node is available in PATH
                try {
                    val process = ProcessBuilder("which", "node").start()
                    val result = process.inputStream.bufferedReader().readText().trim()
                    if (result.isNotEmpty() && File(result).exists()) {
                        return result
                    }
                } catch (e: Exception) {
                    // Ignore
                }
                return path
            }
            if (File(path).exists()) {
                return path
            }
        }

        return "node"
    }

    override fun dispose() {
        stopServer()
        // Clean up extracted server
        extractedServerPath?.parentFile?.deleteRecursively()
    }

    companion object {
        fun getInstance(project: Project): ReactCompilerLspServerManager {
            return project.getService(ReactCompilerLspServerManager::class.java)
        }
    }
}

// Simple language client implementation
class ReactCompilerLanguageClient : org.eclipse.lsp4j.services.LanguageClient {
    override fun telemetryEvent(obj: Any?) {}

    override fun publishDiagnostics(diagnostics: PublishDiagnosticsParams?) {}

    override fun showMessage(params: MessageParams?) {
        params?.let {
            thisLogger().info("LSP Server message [${it.type}]: ${it.message}")
        }
    }

    override fun showMessageRequest(params: ShowMessageRequestParams?): CompletableFuture<MessageActionItem> {
        return CompletableFuture.completedFuture(null)
    }

    override fun logMessage(params: MessageParams?) {
        params?.let {
            when (it.type) {
                MessageType.Error -> thisLogger().error("LSP: ${it.message}")
                MessageType.Warning -> thisLogger().warn("LSP: ${it.message}")
                MessageType.Info -> thisLogger().info("LSP: ${it.message}")
                MessageType.Log -> thisLogger().debug("LSP: ${it.message}")
                else -> thisLogger().info("LSP: ${it.message}")
            }
        }
    }

    override fun refreshInlayHints(): CompletableFuture<Void> {
        return CompletableFuture.completedFuture(null)
    }
}
