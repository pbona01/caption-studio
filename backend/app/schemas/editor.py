from typing import Any, Literal

from pydantic import BaseModel, Field


class EditorProjectDocument(BaseModel):
    schemaVersion: Literal[1] = 1
    projectId: str
    presetId: str = "big-bold"
    reveal: dict[str, Any] = Field(default_factory=dict)
    customPresets: list[dict[str, Any]] = Field(default_factory=list)
    favoritePresetIds: list[str] = Field(default_factory=list)
    recentPresetIds: list[str] = Field(default_factory=list)
    projectOverrides: dict[str, Any] = Field(default_factory=dict)
    segmentOverrides: dict[str, dict[str, Any]] = Field(default_factory=dict)
    wordOverrides: dict[str, dict[str, Any]] = Field(default_factory=dict)
    textLayers: list[dict[str, Any]] = Field(default_factory=list)
    keyframes: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)


def default_editor_document(project_id: str) -> EditorProjectDocument:
    return EditorProjectDocument(
        projectId=project_id,
        projectOverrides={
            "transform": {
                "x": 0.5,
                "y": 0.5,
                "scaleX": 1.0,
                "scaleY": 1.0,
                "rotation": 0.0,
                "anchorX": 0.5,
                "anchorY": 0.5,
            }
        },
        reveal={
            "mode": "smart-chunks",
            "wordsPerPage": 4,
            "wordsPerLine": 3,
            "linesPerPage": 2,
            "charactersPerSecond": 18,
            "preRollMs": 0,
            "postRollMs": 100,
            "activeWordLeadMs": 0,
            "buildKeepsPreviousWords": True,
            "clearOnPause": True,
            "pauseThresholdMs": 350,
            "cursor": "off",
        },
        settings={
            "showSafeAreas": True,
            "showGuides": True,
            "safeAreaPreset": "tiktok-reels",
            "canvasZoom": "fit",
        },
    )
