"""
fp_growth_analysis.py
---------------------
Module 2 – FP-Growth Association Rule Mining on chess opening moves.

What this module does
---------------------
1. Encodes each game's opening plies as a *transaction* (a set of SAN tokens).
   We use sets (not sequences) because FP-Growth is an itemset algorithm.
2. Runs mlxtend's FPGrowth to find frequent itemsets at each support level.
3. Generates association rules and reports support, confidence, and lift.
4. Validates the metrics independently (manual cross-check formulas).
5. Analyses patterns separately for White Win, Black Win, and Draw subsets.
6. Returns DataFrames and saves CSVs.

⚠️  Key distinction (viva note)
--------------------------------
  * Support / Confidence / Lift  → Association Rule Mining metrics.
  * Accuracy / Precision / etc.  → ML metrics (see ml_extension.py).
  Association rules describe *co-occurrence*, NOT causation.
"""

import logging
import os

import pandas as pd
import numpy as np
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import fpgrowth, association_rules

import config

log = logging.getLogger(__name__)


# ── Encoding ──────────────────────────────────────────────────────────────────

def encode_transactions(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    Convert list-of-moves column → boolean one-hot DataFrame.

    Each row = one game; each column = one SAN move token.
    The encoder treats moves as an *unordered* set (suitable for FP-Growth).

    Returns
    -------
    encoded_df   : bool DataFrame  (shape: n_games × n_unique_moves)
    item_names   : column names
    """
    transactions = df["opening_plies"].tolist()
    te = TransactionEncoder()
    te_array = te.fit(transactions).transform(transactions)
    encoded_df = pd.DataFrame(te_array, columns=te.columns_)
    log.info("  Transaction matrix: %d rows × %d items", *encoded_df.shape)
    return encoded_df, list(te.columns_)


# ── FP-Growth ─────────────────────────────────────────────────────────────────

def run_fpgrowth(
    encoded_df: pd.DataFrame,
    min_support: float = config.DEFAULT_MIN_SUPPORT,
) -> pd.DataFrame:
    """
    Run mlxtend FP-Growth and return frequent itemsets DataFrame.

    Columns: support (float), itemsets (frozenset)
    """
    log.info("  Running FP-Growth  (min_support=%.4f) …", min_support)
    freq_items = fpgrowth(encoded_df, min_support=min_support, use_colnames=True)
    log.info("  Frequent itemsets found: %d", len(freq_items))
    return freq_items


def generate_rules(
    freq_items: pd.DataFrame,
    min_confidence: float = config.DEFAULT_MIN_CONFIDENCE,
    min_lift: float = config.DEFAULT_MIN_LIFT,
) -> pd.DataFrame:
    """
    Derive association rules from frequent itemsets.

    Returned DataFrame columns:
        antecedents, consequents, support, confidence, lift,
        leverage, conviction, zhangs_metric
    """
    if freq_items.empty:
        log.warning("  No frequent itemsets — skipping rule generation.")
        return pd.DataFrame()

    rules = association_rules(
        freq_items,
        metric="confidence",
        min_threshold=min_confidence,
    )
    # Apply lift filter
    rules = rules[rules["lift"] >= min_lift].copy()
    # Sort by lift desc, then confidence desc
    rules.sort_values(["lift", "confidence"], ascending=False, inplace=True)
    rules.reset_index(drop=True, inplace=True)
    log.info("  Rules after filters: %d", len(rules))
    return rules


# ── Independent Metric Validation ────────────────────────────────────────────

def validate_top_rule(
    rules: pd.DataFrame,
    encoded_df: pd.DataFrame,
    n: int = 1,
) -> pd.DataFrame:
    """
    Independently verify support, confidence, and lift for the top-`n` rules
    by counting directly in the boolean transaction matrix.

    This cross-check proves metrics are not blindly copied from mlxtend.

    Returns a DataFrame with columns:
        rule, reported_support, manual_support,
        reported_confidence, manual_confidence,
        reported_lift, manual_lift
    """
    if rules.empty:
        return pd.DataFrame()

    records = []
    n_games = len(encoded_df)

    for _, row in rules.head(n).iterrows():
        ant = list(row["antecedents"])
        con = list(row["consequents"])

        # P(antecedents) – games containing ALL antecedent items
        ant_mask = encoded_df[ant].all(axis=1)
        # P(consequents) – games containing ALL consequent items
        con_mask = encoded_df[con].all(axis=1)
        # P(A ∪ C)
        both_mask = ant_mask & con_mask

        man_sup  = both_mask.sum() / n_games
        man_conf = both_mask.sum() / ant_mask.sum() if ant_mask.sum() > 0 else 0
        p_con    = con_mask.sum() / n_games
        man_lift = man_conf / p_con if p_con > 0 else 0

        rule_str = f"{set(ant)} → {set(con)}"
        records.append({
            "rule":                rule_str,
            "reported_support":    round(row["support"], 6),
            "manual_support":      round(man_sup, 6),
            "reported_confidence": round(row["confidence"], 6),
            "manual_confidence":   round(man_conf, 6),
            "reported_lift":       round(row["lift"], 6),
            "manual_lift":         round(man_lift, 6),
        })

    val_df = pd.DataFrame(records)
    return val_df


# ── Per-Outcome Analysis ───────────────────────────────────────────────────────

def analyse_outcome_patterns(
    subsets: dict[str, pd.DataFrame],
    total_games: int,
    min_support: float = config.DEFAULT_MIN_SUPPORT,
    min_confidence: float = config.DEFAULT_MIN_CONFIDENCE,
) -> dict[str, dict]:
    """
    For each outcome (White Win / Black Win / Draw), run FP-Growth and
    compute:
        - frequent itemsets within that subset
        - association rules within that subset
        - per-item frequency and estimated win/draw rate across the FULL dataset

    Parameters
    ----------
    subsets       : dict returned by data_loader.get_outcome_subsets()
    total_games   : len(full_df) — used to compute cross-outcome rates
    min_support   : applied within each subset (relative to subset size)

    Returns
    -------
    dict keyed by outcome label, each containing:
        'freq_items', 'rules', 'item_freq_df'
    """
    results = {}
    for outcome, sub_df in subsets.items():
        log.info("── Outcome subset: %s (%d games) ──", outcome, len(sub_df))
        if len(sub_df) < 10:
            log.warning("  Too few games for %s — skipping.", outcome)
            results[outcome] = {}
            continue

        enc, _ = encode_transactions(sub_df)
        freq_items = run_fpgrowth(enc, min_support=min_support)
        rules      = generate_rules(freq_items, min_confidence=min_confidence)

        # Per-item frequency table
        item_counts = enc.sum().sort_values(ascending=False)
        item_freq = pd.DataFrame({
            "move":           item_counts.index,
            "count_in_subset": item_counts.values,
            "freq_in_subset":  item_counts.values / len(sub_df),
            "subset_share_of_total": item_counts.values / total_games,
            "outcome": outcome,
        }).reset_index(drop=True)

        results[outcome] = {
            "freq_items":   freq_items,
            "rules":        rules,
            "item_freq_df": item_freq,
        }

    return results


# ── Support Sensitivity ────────────────────────────────────────────────────────

def support_sensitivity(
    encoded_df: pd.DataFrame,
    support_levels: list[float] = config.MIN_SUPPORT_LEVELS,
    min_confidence: float       = config.DEFAULT_MIN_CONFIDENCE,
) -> pd.DataFrame:
    """
    Run FP-Growth at each support level in `support_levels` and record
    the number of frequent itemsets and rules generated.

    Returns a tidy DataFrame for plotting.
    """
    records = []
    for sup in support_levels:
        freq = run_fpgrowth(encoded_df, min_support=sup)
        rules = generate_rules(freq, min_confidence=min_confidence) if not freq.empty else pd.DataFrame()
        records.append({
            "min_support":   sup,
            "n_freq_items":  len(freq),
            "n_rules":       len(rules),
        })
    return pd.DataFrame(records)


# ── Save Results ──────────────────────────────────────────────────────────────

def _fmt_frozenset(s):
    """Serialize frozenset to readable string for CSV export."""
    return ", ".join(sorted(str(x) for x in s))


def save_rules_csv(rules: pd.DataFrame, filename: str) -> None:
    """Save association rules to CSV with readable antecedent/consequent columns."""
    if rules.empty:
        log.warning("  No rules to save for %s.", filename)
        return
    out = rules.copy()
    out["antecedents"] = out["antecedents"].map(_fmt_frozenset)
    out["consequents"] = out["consequents"].map(_fmt_frozenset)
    path = os.path.join(config.CSV_DIR, filename)
    out.to_csv(path, index=False)
    log.info("  Saved → %s", path)


def run_full_fp_analysis(df: pd.DataFrame, subsets: dict) -> dict:
    """
    Orchestrates the complete FP-Growth pipeline and saves outputs.

    Returns a results dict with keys:
        'encoded_df', 'freq_items', 'rules', 'validation',
        'outcome_results', 'sensitivity'
    """
    log.info("=== FP-Growth Analysis ===")

    # Encode full dataset
    encoded_df, _ = encode_transactions(df)

    # Run at default support
    freq_items = run_fpgrowth(encoded_df)
    rules      = generate_rules(freq_items)

    # Top-10 rules display
    top10 = rules.head(config.TOP_K_RULES)
    log.info("\nTop %d Association Rules (by lift):\n%s",
             config.TOP_K_RULES, top10[["antecedents","consequents","support","confidence","lift"]].to_string())

    # Independent validation (top 5 rules)
    val_df = validate_top_rule(rules, encoded_df, n=min(5, len(rules)))
    log.info("\nMetric Validation (manual cross-check):\n%s", val_df.to_string())

    # Per-outcome analysis
    outcome_results = analyse_outcome_patterns(subsets, total_games=len(df))

    # Support sensitivity
    sensitivity_df = support_sensitivity(encoded_df)
    log.info("\nSupport Sensitivity:\n%s", sensitivity_df.to_string())

    # ── Save CSVs ─────────────────────────────────────────────────────────────
    save_rules_csv(rules, "fp_growth_all_rules.csv")
    save_rules_csv(top10, "fp_growth_top10_rules.csv")

    val_path = os.path.join(config.CSV_DIR, "fp_growth_validation.csv")
    val_df.to_csv(val_path, index=False)
    log.info("  Saved → %s", val_path)

    sens_path = os.path.join(config.CSV_DIR, "fp_growth_sensitivity.csv")
    sensitivity_df.to_csv(sens_path, index=False)
    log.info("  Saved → %s", sens_path)

    for outcome, res in outcome_results.items():
        if not res:
            continue
        safe = outcome.replace(" ", "_").lower()
        save_rules_csv(res["rules"], f"fp_growth_{safe}_rules.csv")
        ifd_path = os.path.join(config.CSV_DIR, f"fp_growth_{safe}_item_freq.csv")
        res["item_freq_df"].to_csv(ifd_path, index=False)
        log.info("  Saved → %s", ifd_path)

    return {
        "encoded_df":       encoded_df,
        "freq_items":       freq_items,
        "rules":            rules,
        "top10":            top10,
        "validation":       val_df,
        "outcome_results":  outcome_results,
        "sensitivity":      sensitivity_df,
    }
