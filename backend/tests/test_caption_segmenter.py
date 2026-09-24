from app.schemas.captions import TranscriptWord
from app.services.caption_segmenter import create_segments


def word(index: int, text: str, start: float, end: float) -> TranscriptWord:
    return TranscriptWord(
        id=f"word-{index}",
        text=text,
        start=start,
        end=end,
        confidence=0.99,
    )


def test_breaks_on_pause_and_punctuation_with_one_emphasis_each() -> None:
    words = [
        word(1, "This", 0.0, 0.2),
        word(2, "could", 0.2, 0.4),
        word(3, "change", 0.4, 0.8),
        word(4, "everything.", 0.8, 1.2),
        word(5, "New", 1.7, 1.9),
        word(6, "chapter", 1.9, 2.3),
    ]

    segments = create_segments(words)

    assert len(segments) == 2
    assert [item.text for item in segments[0].words] == [
        "This",
        "could",
        "change",
        "everything.",
    ]
    assert sum(item.emphasis for item in segments[0].words) == 1
    assert sum(item.emphasis for item in segments[1].words) == 1


def test_never_exceeds_maximum_word_count() -> None:
    words = [word(index, f"meaningful{index}", index * 0.2, index * 0.2 + 0.18) for index in range(8)]

    segments = create_segments(words)

    assert all(len(segment.words) <= 5 for segment in segments)
