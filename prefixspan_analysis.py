"""
prefixspan_analysis.py
----------------------
Module 3 – PrefixSpan Sequential Pattern Mining on chess opening moves.

What this module does
---------------------
1. Treats each game's opening plies as an *ordered sequence* (unlike FP-Growth
   which uses unordered itemsets).
2. Runs PrefixSpan at multiple support levels.
3. Compares discovered sequences with FP-Growth frequent itemsets to highlight
   differences between order-sensitive and order-insensitive methods.
4. Saves results to CSV.

⚠️  Key distinction
--------------------
  FP-Growth  →  Unordered itemsets  (e.g., {e4, e5, Nf3} appears together)
  PrefixSpan →  Ordered sequences   (e.g., e4 → e5 → Nf3 in that order)

  PrefixSpan sequences honour MOVE ORDER, which is crucial in chess because
  the same moves in a different order can represent entirely different openings.
"""

import logging
import os

import pandas as pd
from prefixspan import PrefixSpan

import config

log = logging.getLogger(__name__)


# ── Run PrefixSpan ─────────────────────────────────────────────────────────────

def run_prefixspan(
    df: pd.DataFrame,
    min_support_frac: float = config.PREFIXSPAN_MIN_SUPPORT,
) -> pd.DataFrame:
    """
    Run PrefixSpan on the ordered opening sequences.

    Parameters
    ----------
    df               : DataFrame with 'opening_plies' column (list[str])
    min_support_frac : minimum support as a fraction of total games

    Returns
    -------
    DataFrame with columns:
        support_count, support_frac, sequence_length, pattern
    """
    sequences = df["opening_plies"].tolist()
    n_games   = len(sequences)
    min_count = max(1, int(min_support_frac * n_games))

    log.info(
        "  Running PrefixSpan on %d sequences  (min_support=%.4f → %d games) …",
        n_games, min_support_frac, min_count,
    )

    ps = PrefixSpan(sequences)
    ps.minlen = 2           # at least 2 moves for a meaningful pattern
    results = ps.frequent(min_count)

    records = []
    for count, pattern in results:
        records.append({
            "support_count":  count,
            "support_frac":   round(count / n_games, 6),
            "sequence_length": len(pattern),
            "pattern":        " → ".join(pattern),
        })

    result_df = pd.DataFrame(records).sort_values(
        ["support_frac", "sequence_length"], ascending=[False, False]
    ).reset_index(drop=True)

    log.info("  PrefixSpan patterns found: %d", len(result_df))
    return result_df


# ── Multi-Support Sweep ────────────────────────────────────────────────────────

def run_prefixspan_sweep(
    df: pd.DataFrame,
    support_levels: list[float] = config.MIN_SUPPORT_LEVELS,
) -> pd.DataFrame:
    """
    Run PrefixSpan at each support level and record pattern counts.

    Returns a tidy DataFrame for plotting/comparison.
    """
    records = []
    for sup in support_levels:
        result_df = run_prefixspan(df, min_support_frac=sup)
        records.append({
            "min_support":    sup,
            "n_patterns":     len(result_df),
            "avg_len":        result_df["sequence_length"].mean() if len(result_df) else 0,
        })
    return pd.DataFrame(records)


# ── Compare PrefixSpan vs FP-Growth ──────────────────────────────────────────

def compare_with_fpgrowth(
    ps_df: pd.DataFrame,
    fp_freq_items: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compare PrefixSpan sequences with FP-Growth itemsets.

    For each PrefixSpan pattern, check whether its move-set appears as a
    frequent itemset in FP-Growth (order-agnostic match).

    Returns a comparison DataFrame with an 'in_fp_growth' boolean column.
    """
    if fp_freq_items.empty or ps_df.empty:
        return ps_df

    # Build set-of-frozensets from FP-Growth
    fp_sets = set(fp_freq_items["itemsets"].tolist())

    def _check(pattern_str: str) -> bool:
        moves = frozenset(pattern_str.split(" → "))
        return moves in fp_sets

    comp = ps_df.copy()
    comp["in_fp_growth"] = comp["pattern"].apply(_check)
    return comp


# ── Per-Outcome PrefixSpan ────────────────────────────────────────────────────

def run_prefixspan_by_outcome(
    subsets: dict[str, pd.DataFrame],
    min_support_frac: float = config.PREFIXSPAN_MIN_SUPPORT,
) -> dict[str, pd.DataFrame]:
    """
    Run PrefixSpan separately for each outcome subset.

    Returns a dict keyed by outcome label.
    """
    results = {}
    for outcome, sub_df in subsets.items():
        log.info("── PrefixSpan for outcome: %s ──", outcome)
        if len(sub_df) < 10:
            results[outcome] = pd.DataFrame()
            continue
        results[outcome] = run_prefixspan(sub_df, min_support_frac=min_support_frac)
    return results


# ── Orchestrator ──────────────────────────────────────────────────────────────

def run_full_prefixspan_analysis(
    df: pd.DataFrame,
    subsets: dict,
    fp_freq_items: pd.DataFrame,
) -> dict:
    """
    Full PrefixSpan pipeline: run at default support, compare with FP-Growth,
    run per-outcome, do multi-support sweep, save CSVs.

    Returns
    -------
    dict with keys: 'ps_df', 'comparison', 'by_outcome', 'sweep'
    """
    log.info("=== PrefixSpan Analysis ===")

    # ── Main run ──────────────────────────────────────────────────────────────
    ps_df = run_prefixspan(df)

    # ── Compare with FP-Growth ────────────────────────────────────────────────
    comparison = compare_with_fpgrowth(ps_df, fp_freq_items)
    matched = comparison["in_fp_growth"].sum() if "in_fp_growth" in comparison.columns else 0
    log.info(
        "  PrefixSpan patterns also found by FP-Growth (order-agnostic): %d / %d",
        matched, len(comparison),
    )

    # ── Per-outcome ────────────────────────────────────────────────────────────
    by_outcome = run_prefixspan_by_outcome(subsets)

    # ── Multi-support sweep ───────────────────────────────────────────────────
    sweep_df = run_prefixspan_sweep(df)
    log.info("\nPrefixSpan Support Sweep:\n%s", sweep_df.to_string())

    # ── Save CSVs ─────────────────────────────────────────────────────────────
    ps_path = os.path.join(config.CSV_DIR, "prefixspan_patterns.csv")
    ps_df.to_csv(ps_path, index=False)
    log.info("  Saved → %s", ps_path)

    cmp_path = os.path.join(config.CSV_DIR, "prefixspan_vs_fpgrowth.csv")
    comparison.to_csv(cmp_path, index=False)
    log.info("  Saved → %s", cmp_path)

    sweep_path = os.path.join(config.CSV_DIR, "prefixspan_sweep.csv")
    sweep_df.to_csv(sweep_path, index=False)
    log.info("  Saved → %s", sweep_path)

    for outcome, ps_res in by_outcome.items():
        if ps_res.empty:
            continue
        safe = outcome.replace(" ", "_").lower()
        path = os.path.join(config.CSV_DIR, f"prefixspan_{safe}.csv")
        ps_res.to_csv(path, index=False)
        log.info("  Saved → %s", path)

    return {
        "ps_df":      ps_df,
        "comparison": comparison,
        "by_outcome": by_outcome,
        "sweep":      sweep_df,
    }
