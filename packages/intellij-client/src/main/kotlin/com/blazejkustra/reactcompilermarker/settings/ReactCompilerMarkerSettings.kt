package com.blazejkustra.reactcompilermarker.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project
import com.intellij.util.xmlb.XmlSerializerUtil

@Service(Service.Level.PROJECT)
@State(
    name = "ReactCompilerMarkerSettings",
    storages = [Storage("reactCompilerMarker.xml")]
)
class ReactCompilerMarkerSettings : PersistentStateComponent<ReactCompilerMarkerSettings.State> {

    private var myState = State()

    class State {
        var isEnabled: Boolean = true
        var successEmoji: String = "\u2728" // ✨
        var errorEmoji: String = "\uD83D\uDEAB" // 🚫
        var babelPluginPath: String = "node_modules/babel-plugin-react-compiler"
    }

    override fun getState(): State = myState

    override fun loadState(state: State) {
        XmlSerializerUtil.copyBean(state, myState)
    }

    var isEnabled: Boolean
        get() = myState.isEnabled
        set(value) {
            myState.isEnabled = value
        }

    var successEmoji: String
        get() = myState.successEmoji
        set(value) {
            myState.successEmoji = value
        }

    var errorEmoji: String
        get() = myState.errorEmoji
        set(value) {
            myState.errorEmoji = value
        }

    var babelPluginPath: String
        get() = myState.babelPluginPath
        set(value) {
            myState.babelPluginPath = value
        }

    fun toMap(): Map<String, Any?> = mapOf(
        "successEmoji" to successEmoji,
        "errorEmoji" to errorEmoji,
        "babelPluginPath" to babelPluginPath
    )

    companion object {
        fun getInstance(project: Project): ReactCompilerMarkerSettings {
            return project.getService(ReactCompilerMarkerSettings::class.java)
        }
    }
}
