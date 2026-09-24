import re

from app.config import settings
from app.schemas.captions import CaptionSegment, TranscriptWord
from app.services.emphasis_engine import apply_emphasis

STRONG_END = re.compile(r"[.!?]$")
SOFT_END = re.compile(r"[,;:]$")
MAX_VISUAL_CHARACTERS = 34


def _segment(words: list[TranscriptWord], index: int) -> CaptionSegment:
    emphasized = apply_emphasis(words)
    return CaptionSegment(
        id=f"segment-{index}",
        start=emphasized[0].start,
        end=emphasized[-1].end,
        words=emphasized,
    )


def create_segments(words: list[TranscriptWord]) -> list[CaptionSegment]:
    groups: list[list[TranscriptWord]] = []
    current: list[TranscriptWord] = []

    for word in words:
        if current:
            pause = max(0.0, word.start - current[-1].end)
            projected_duration = word.end - current[0].start
            projected_characters = sum(len(item.text) + 1 for item in current) + len(word.text)
            should_break_before = (
                pause >= settings.caption_pause_break
                or len(current) >= settings.caption_max_words
                or projected_duration > settings.caption_max_duration
                or projected_characters > MAX_VISUAL_CHARACTERS
            )
            if should_break_before:
                groups.append(current)
                current = []

        current.append(word)
        enough_words = len(current) >= settings.caption_target_words
        if STRONG_END.search(word.text) or (enough_words and SOFT_END.search(word.text)):
            groups.append(current)
            current = []

    if current:
        groups.append(current)

    segments = [_segment(group, index + 1) for index, group in enumerate(groups)]
    return segments

