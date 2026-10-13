"""
smoke_test.py
-------------
Quick validation script — runs the full pipeline on a small sample (500 games)
to verify all modules work end-to-end before the full ~709k game run.

Usage:
    python smoke_test.py
"""

import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Override MAX_GAMES before importing config-dependent modules ───────────────
import config
config.MAX_GAMES            = 500
config.DEFAULT_MIN_SUPPORT  = 0.05    # higher threshold for tiny dataset
config.PREFIXSPAN_MIN_SUPPORT = 0.05
config.MIN_SUPPORT_LEVELS   = [0.10, 0.05, 0.02]

import data_loader
import fp_growth_analysis
import prefixspan_analysis
import ml_extension
import visualisation
import summary_report

def smoke():
    log.info("=" * 50)
    log.info("  SMOKE TEST  (500 games, adjusted thresholds)")
    log.info("=" * 50)

    df = data_loader.load_and_preprocess()
    log.info("✓ Data loaded: %d games", len(df))

    subsets = data_loader.get_outcome_subsets(df)
    log.info("✓ Subsets: %s", {k: len(v) for k, v in subsets.items()})

    fp_results = fp_growth_analysis.run_full_fp_analysis(df, subsets)
    log.info("✓ FP-Growth: %d rules", len(fp_results["rules"]))

    ps_results = prefixspan_analysis.run_full_prefixspan_analysis(
        df, subsets, fp_results["freq_items"]
    )
    log.info("✓ PrefixSpan: %d patterns", len(ps_results["ps_df"]))

    ml_results = ml_extension.run_full_ml_analysis(df)
    log.info("✓ ML: LR acc=%.3f  RF acc=%.3f",
             ml_results["lr"]["accuracy"], ml_results["rf"]["accuracy"])

    visualisation.generate_all_plots(df, fp_results, ps_results, ml_results)
    log.info("✓ All graphs saved")

    summary_report.generate_summary(df, fp_results, ps_results, ml_results)
    log.info("✓ Summary report saved")

    log.info("\n✅  Smoke test PASSED — outputs in %s", config.OUTPUT_DIR)

if __name__ == "__main__":
    smoke()
