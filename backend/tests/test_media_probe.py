from pathlib import Path

from app.services import media_probe


def test_finds_winget_ffprobe_when_path_is_stale(monkeypatch, tmp_path: Path) -> None:
    alias = tmp_path / "Microsoft" / "WinGet" / "Links" / "ffprobe.exe"
    alias.parent.mkdir(parents=True)
    alias.touch()
    monkeypatch.setattr(media_probe.shutil, "which", lambda _: None)
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))

    assert media_probe.find_media_executable("ffprobe") == str(alias)
