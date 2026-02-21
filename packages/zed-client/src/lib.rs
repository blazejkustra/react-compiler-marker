use std::env;
use std::fs;
use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

const SERVER_BUNDLE: &[u8] = include_bytes!("../server/server.bundle.js");
const SERVER_PATH: &str = "server/server.bundle.js";

struct ReactCompilerMarkerExtension;

impl zed::Extension for ReactCompilerMarkerExtension {
    fn new() -> Self {
        // Write the bundled server to the work directory
        let _ = fs::create_dir_all("server");
        let _ = fs::write(SERVER_PATH, SERVER_BUNDLE);
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let server_path = env::current_dir()
            .unwrap()
            .join(SERVER_PATH)
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
