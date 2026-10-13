"""
config.py
---------
Central configuration for the Chess Opening Pattern Mining project.
Adjust paths, thresholds, and parameters here — no other file needs editing.
"""

import os

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = BASE_DIR                                         # dataset sits at root
OUTPUT_DIR  = os.path.join(BASE_DIR, "output")
GRAPHS_DIR  = os.path.join(OUTPUT_DIR, "graphs")
CSV_DIR     = os.path.join(OUTPUT_DIR, "csv")

# Raw dataset filename  (tournament-chess-games.csv placed in project root)
RAW_DATA_FILE = os.path.join(DATA_DIR, "tournament-chess-games.csv")

# ── Data Processing ──────────────────────────────────────────────────────────
# Set to an integer (e.g. 50000) to run a quick test; None = use all ~709k games
MAX_GAMES   = None
NUM_PLIES   = 10          # first N plies (half-moves) to analyse

# ── Association Rule Mining (FP-Growth) ──────────────────────────────────────
MIN_SUPPORT_LEVELS     = [0.01, 0.005, 0.001]   # sensitivity grid
DEFAULT_MIN_SUPPORT    = 0.005
DEFAULT_MIN_CONFIDENCE = 0.50
DEFAULT_MIN_LIFT       = 1.0
TOP_K_RULES            = 10                      # rules shown in report

# ── PrefixSpan ───────────────────────────────────────────────────────────────
PREFIXSPAN_MIN_SUPPORT = 0.005   # fraction of games

# ── ML Extension ─────────────────────────────────────────────────────────────
TEST_SIZE    = 0.20
RANDOM_STATE = 42

# ── Dataset Column Names (real Lichess tournament CSV) ────────────────────────
COL_MOVETEXT = "movetext"       # full PGN move string with annotations
COL_RESULT   = "Result"         # "1-0" | "0-1" | "1/2-1/2" | "*"
COL_WHITE_ELO = "WhiteElo"
COL_BLACK_ELO = "BlackElo"
COL_OPENING   = "Opening"       # ECO opening name
COL_ECO       = "ECO"

# ── Outcome Labels ────────────────────────────────────────────────────────────
OUTCOME_WHITE = "White Win"
OUTCOME_BLACK = "Black Win"
OUTCOME_DRAW  = "Draw"

# ── Ensure output directories exist ──────────────────────────────────────────
for _d in [OUTPUT_DIR, GRAPHS_DIR, CSV_DIR]:
    os.makedirs(_d, exist_ok=True)
