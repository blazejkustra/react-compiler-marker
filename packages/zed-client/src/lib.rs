use std::env;
use std::fs;
use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

// The server is downloaded from this repository's `zed-v*` release rather than
// embedded in the extension: Zed's publishing rules require an extension to
// download its language server instead of shipping one.
//
// Bump this when a new server bundle is released. It names both the release the
// bundle is fetched from and the directory it is cached in, so a bump downloads
// the new bundle instead of reusing the old one.
const SERVER_RELEASE_TAG: &str = "zed-v0.1.0";

struct ReactCompilerMarkerExtension;

impl ReactCompilerMarkerExtension {
    /// Path to the server bundle for the pinned release, downloading it first if
    /// this is the first launch since that tag was set.
    fn ensure_server_bundle(language_server_id: &LanguageServerId) -> Result<String> {
        let server_dir = format!("server-{SERVER_RELEASE_TAG}");
        let bundle_path = format!("{server_dir}/server.bundle.js");

        let cached = fs::metadata(&bundle_path)
            .map(|metadata| metadata.len() > 0)
            .unwrap_or(false);
        if cached {
            return Ok(bundle_path);
        }

        fs::create_dir_all(&server_dir)
            .map_err(|err| format!("failed to create {server_dir}: {err}"))?;

        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::Downloading,
        );
        let url = format!(
            "https://github.com/blazejkustra/react-compiler-marker/releases/download/{SERVER_RELEASE_TAG}/server.bundle.js"
        );
        zed::download_file(&url, &bundle_path, zed::DownloadedFileType::Uncompressed)
            .map_err(|err| format!("failed to download the language server: {err}"))?;
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::None,
        );

        Ok(bundle_path)
    }
}

impl zed::Extension for ReactCompilerMarkerExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let server_path = env::current_dir()
            .map_err(|err| format!("failed to resolve the working directory: {err}"))?
            .join(Self::ensure_server_bundle(language_server_id)?)
            .to_string_lossy()
            .to_string();

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![server_path, "--stdio".to_string()],
            env: vec![],
        })
    }

    fn language_server_initialization_options(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree("react-compiler-marker", worktree)
            .ok()
            .and_then(|s| s.initialization_options);

        let mut options = settings.unwrap_or_else(|| serde_json::json!({}));
        if let serde_json::Value::Object(ref mut map) = options {
            map.entry("tooltipFormat".to_string())
                .or_insert(serde_json::json!("markdown"));
        }

        Ok(Some(options))
    }

    fn language_server_workspace_configuration(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree("react-compiler-marker", worktree)
            .ok()
            .and_then(|s| s.settings);

        Ok(Some(serde_json::json!({
            "reactCompilerMarker": settings.unwrap_or_else(|| serde_json::json!({}))
        })))
    }
}

zed::register_extension!(ReactCompilerMarkerExtension);
