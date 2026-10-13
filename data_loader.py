"""
data_loader.py
--------------
Module 1 – Load and pre-process the Lichess Tournament Chess Games dataset.

Dataset columns used
--------------------
  movetext  : Full PGN move text string with optional annotations
              e.g. "1. d4 { [%eval 0.25] } 1... Nf6 { [%clk 1:30:42] } ..."
  Result    : "1-0" (White wins) | "0-1" (Black wins) | "1/2-1/2" (Draw)
  WhiteElo  : Elo rating of white player
  BlackElo  : Elo rating of black player
  Opening   : ECO opening name string

What this module does
---------------------
* Strip PGN annotations ({ ... }, move numbers, $-NAG codes, clock tags) from
  movetext to produce a clean SAN token list.
* Extract the first NUM_PLIES clean SAN moves per game.
* Map Result → White Win / Black Win / Draw.
* Filter out games with result "*" (unfinished/unknown).
* Filter out non-Standard chess variants.
* Return a clean DataFrame ready for downstream analysis.

⚠️  No post-opening information (moves after ply 10, eval, result cues)
    is passed to downstream ML — preventing data leakage entirely.
"""

import io
import logging
import re

import chess
import chess.pgn
import pandas as pd
from tqdm import tqdm

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Regex: strip PGN annotation noise ────────────────────────────────────────
# Removes: { comment blocks }, move numbers (1. 1... 10...), NAG ($12), clock tags
_STRIP_COMMENTS = re.compile(r'\{[^}]*\}')          # {...} blocks
_STRIP_MOVENUMS  = re.compile(r'\d+\.{1,3}\s*')     # 1. / 1... / 10...
_STRIP_NAG       = re.compile(r'\$\d+')              # NAG codes like $12
_STRIP_RESULT    = re.compile(r'(1-0|0-1|1/2-1/2|\*)$')  # trailing result token


def _clean_movetext(movetext: str) -> list[str]:
    """
    Parse a raw PGN movetext string (with eval/clock annotations) and return
    a list of clean SAN tokens.

    Example input:
        '1. d4 { [%eval 0.25] } 1... Nf6 { [%clk 1:30] } 2. c4 ...'
    Returns:
        ['d4', 'Nf6', 'c4', ...]
    """
    s = str(movetext)
    s = _STRIP_COMMENTS.sub(' ', s)
    s = _STRIP_MOVENUMS.sub(' ', s)
    s = _STRIP_NAG.sub(' ', s)
    s = _STRIP_RESULT.sub(' ', s)
    tokens = [t.strip() for t in s.split() if t.strip()]
    return tokens


def _extract_plies(movetext: str, n: int) -> list[str]:
    """
    Extract the first `n` legal SAN moves from a PGN movetext string.

    Uses python-chess to validate move legality and normalise SAN notation.
    Returns an empty list if parsing fails (malformed PGN, illegal move, etc.).
    """
    try:
        san_tokens = _clean_movetext(movetext)[:n * 2]  # over-sample, then trim
        if not san_tokens:
            return []

        board = chess.Board()
        extracted = []
        for token in san_tokens:
            if len(extracted) >= n:
                break
            try:
                move = board.parse_san(token)
                san  = board.san(move)          # normalise (e.g. "0-0" → "O-O")
                board.push(move)
                extracted.append(san)
            except (chess.InvalidMoveError, chess.IllegalMoveError,
                    chess.AmbiguousMoveError, ValueError):
                # Stop at the first invalid token — don't skip, because
                # a later token would be on the wrong board position.
                break
        return extracted
    except Exception:
        return []


# ── Outcome mapping ────────────────────────────────────────────────────────────

def _map_result(result_str: str) -> str | None:
    """
    Convert PGN Result string to standardised outcome label.
    Returns None for unfinished / unknown results ("*").
    """
    r = str(result_str).strip()
    if r == "1-0":
        return config.OUTCOME_WHITE
    if r == "0-1":
        return config.OUTCOME_BLACK
    if r == "1/2-1/2":
        return config.OUTCOME_DRAW
    return None   # "*" or anything else → discard


# ── Public API ────────────────────────────────────────────────────────────────

def load_and_preprocess(
    filepath: str = config.RAW_DATA_FILE,
    max_games: int | None = config.MAX_GAMES,
    num_plies: int = config.NUM_PLIES,
) -> pd.DataFrame:
    """
    Load the Lichess tournament CSV and return a preprocessed DataFrame.

    Returned columns
    ----------------
    opening_plies  : list[str]  — first `num_plies` SAN moves
    outcome        : str        — "White Win" | "Black Win" | "Draw"
    white_elo      : float      — White player Elo (if available)
    black_elo      : float      — Black player Elo (if available)
    opening_name   : str        — ECO opening name
    eco            : str        — ECO code

    Parameters
    ----------
    filepath   : path to tournament-chess-games.csv
    max_games  : row cap (None = all ~709 k rows)
    num_plies  : how many half-moves to extract (default 10)
    """
    log.info("Loading dataset: %s", filepath)

    # ── Read only needed columns (speeds up 3.4 GB CSV dramatically) ──────────
    usecols = [config.COL_MOVETEXT, config.COL_RESULT]
    optional = {
        config.COL_WHITE_ELO: "white_elo",
        config.COL_BLACK_ELO: "black_elo",
        config.COL_OPENING:   "opening_name",
        config.COL_ECO:       "eco",
    }
    # Always try to read optional columns; skip silently if absent
    all_cols = usecols + list(optional.keys())

    raw = pd.read_csv(
        filepath,
        usecols=all_cols,
        nrows=max_games,
        low_memory=False,
    )
    log.info("  Raw rows loaded : %d", len(raw))

    # ── Rename optional columns ───────────────────────────────────────────────
    raw.rename(columns={k: v for k, v in optional.items() if k in raw.columns},
               inplace=True)

    # ── Drop rows missing movetext or result ──────────────────────────────────
    raw.dropna(subset=[config.COL_MOVETEXT, config.COL_RESULT], inplace=True)

    # ── Map result → outcome label (drops "*" rows) ───────────────────────────
    raw["outcome"] = raw[config.COL_RESULT].map(_map_result)
    raw.dropna(subset=["outcome"], inplace=True)
    log.info("  After filtering unfinished games: %d rows", len(raw))

    # ── Extract opening plies ─────────────────────────────────────────────────
    log.info("  Extracting first %d plies per game (this may take a few minutes) …",
             num_plies)
    tqdm.pandas(desc="Parsing moves")
    raw["opening_plies"] = raw[config.COL_MOVETEXT].progress_apply(
        lambda m: _extract_plies(m, num_plies)
    )

    # ── Remove games where parsing produced nothing or < 4 plies ─────────────
    raw = raw[raw["opening_plies"].map(len) >= 4].copy()
    log.info("  After ply-parse filter (≥4 plies): %d rows", len(raw))

    # ── Final cleanup ─────────────────────────────────────────────────────────
    raw.drop(columns=[config.COL_MOVETEXT, config.COL_RESULT], inplace=True)
    raw.reset_index(drop=True, inplace=True)

    log.info("Dataset ready. Shape: %s", raw.shape)
    log.info(
        "Outcome distribution:\n%s",
        raw["outcome"].value_counts().to_string()
    )
    return raw


def get_outcome_subsets(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """
    Partition `df` into three subsets by outcome.

    Returns
    -------
    dict with keys config.OUTCOME_WHITE, config.OUTCOME_BLACK, config.OUTCOME_DRAW
    """
    return {
        config.OUTCOME_WHITE: df[df["outcome"] == config.OUTCOME_WHITE].copy(),
        config.OUTCOME_BLACK: df[df["outcome"] == config.OUTCOME_BLACK].copy(),
        config.OUTCOME_DRAW:  df[df["outcome"] == config.OUTCOME_DRAW].copy(),
    }
