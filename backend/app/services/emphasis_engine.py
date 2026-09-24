import re

from app.schemas.captions import TranscriptWord

WEAK_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
    "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
    "was", "we", "were", "with", "you", "your",
}


def _score(word: TranscriptWord) -> float:
    clean = re.sub(r"[^\w$€£%'-]", "", word.text).lower()
    if not clean or clean in WEAK_WORDS:
        return -100
    score = min(len(clean), 12) * 0.45
    if any(character.isdigit() for character in clean):
        score += 7
    if any(symbol in word.text for symbol in "$€£%"):
        score += 5
    if clean.endswith(("ing", "ed", "tion", "ive", "ous", "ize")):
        score += 1.5
    if len(clean) >= 7:
        score += 1.5
    return score


def apply_emphasis(words: list[TranscriptWord]) -> list[TranscriptWord]:
    if not words:
        return words
    winner = max(range(len(words)), key=lambda index: _score(words[index]))
    if _score(words[winner]) < 0:
        winner = len(words) - 1
    for index, word in enumerate(words):
        word.emphasis = index == winner
    return words

