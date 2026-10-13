"""
main.py
-------
Entry point for the Chess Tournament Opening Pattern Mining project.

Run from VS Code terminal:
    python main.py

Pipeline stages
---------------
  Stage 1 – Load & preprocess data          (data_loader.py)
  Stage 2 – FP-Growth association rules     (fp_growth_analysis.py)
  Stage 3 – PrefixSpan sequential patterns  (prefixspan_analysis.py)
  Stage 4 – ML outcome prediction           (ml_extension.py)
  Stage 5 – Visualisations                  (visualisation.py)
  Stage 6 – Analysis summary report         (summary_report.py)

All outputs are saved to:
  output/csv/      – CSV files
  output/graphs/   – PNG charts
  output/analysis_summary.md

⚠️  Note on runtime
--------------------
Parsing ~709k PGN game strings with python-chess takes 10-30 minutes
depending on your CPU. Reduce MAX_GAMES in config.py for quick tests.
"""

import logging
import time

import config
import data_loader
import fp_growth_analysis
import prefixspan_analysis
import ml_extension
import visualisation
import summary_report

log = logging.getLogger(__name__)


def run_pipeline():
    start_total = time.time()
    log.info("=" * 60)
    log.info("  Chess Opening Pattern Mining — Pipeline Start")
    log.info("=" * 60)

    # ─────────────────────────────────────────────────────────────
    # STAGE 1: Load and preprocess data
    # ─────────────────────────────────────────────────────────────
    log.info("\n[STAGE 1] Data Loading & Preprocessing")
    t0 = time.time()
    df = data_loader.load_and_preprocess()
    subsets = data_loader.get_outcome_subsets(df)
    log.info("Stage 1 done in %.1f s\n", time.time() - t0)

    # Save processed dataset overview
    import os, pandas as pd
    overview = df["outcome"].value_counts().reset_index()
    overview.columns = ["outcome", "count"]
    overview["pct"] = (overview["count"] / len(df) * 100).round(2)
    overview.to_csv(os.path.join(config.CSV_DIR, "outcome_distribution.csv"), index=False)

    # ─────────────────────────────────────────────────────────────
    # STAGE 2: FP-Growth Association Rule Mining
    # ─────────────────────────────────────────────────────────────
    log.info("[STAGE 2] FP-Growth Association Rule Mining")
    t0 = time.time()
    fp_results = fp_growth_analysis.run_full_fp_analysis(df, subsets)
    log.info("Stage 2 done in %.1f s\n", time.time() - t0)

    # ─────────────────────────────────────────────────────────────
    # STAGE 3: PrefixSpan Sequential Pattern Mining
    # ─────────────────────────────────────────────────────────────
    log.info("[STAGE 3] PrefixSpan Sequential Pattern Mining")
    t0 = time.time()
    ps_results = prefixspan_analysis.run_full_prefixspan_analysis(
        df, subsets, fp_results["freq_items"]
    )
    log.info("Stage 3 done in %.1f s\n", time.time() - t0)

    # ─────────────────────────────────────────────────────────────
    # STAGE 4: ML Outcome Prediction
    # ─────────────────────────────────────────────────────────────
    log.info("[STAGE 4] ML Outcome Prediction")
    t0 = time.time()
    ml_results = ml_extension.run_full_ml_analysis(df)
    log.info("Stage 4 done in %.1f s\n", time.time() - t0)

    # ─────────────────────────────────────────────────────────────
    # STAGE 5: Visualisations
    # ─────────────────────────────────────────────────────────────
    log.info("[STAGE 5] Generating Visualisations")
    t0 = time.time()
    visualisation.generate_all_plots(df, fp_results, ps_results, ml_results)
    log.info("Stage 5 done in %.1f s\n", time.time() - t0)

    # ─────────────────────────────────────────────────────────────
    # STAGE 6: Analysis Summary Report
    # ─────────────────────────────────────────────────────────────
    log.info("[STAGE 6] Generating Analysis Summary")
    t0 = time.time()
    summary_report.generate_summary(df, fp_results, ps_results, ml_results)
    log.info("Stage 6 done in %.1f s\n", time.time() - t0)

    # ─────────────────────────────────────────────────────────────
    # Done
    # ─────────────────────────────────────────────────────────────
    elapsed = time.time() - start_total
    log.info("=" * 60)
    log.info("  Pipeline complete in %.1f s (%.1f min)", elapsed, elapsed / 60)
    log.info("  Outputs saved to: %s", config.OUTPUT_DIR)
    log.info("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    run_pipeline()
