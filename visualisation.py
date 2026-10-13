"""
visualisation.py
----------------
Module 5 – All charts for the Chess Opening Pattern Mining project.

Charts produced
---------------
 1. Tournament outcome distribution (pie + bar)
 2. Top opening moves by frequency (bar)
 3. Top-10 association rules — lift-confidence scatter
 4. Support vs lift bubble chart
 5. Outcome-specific opening frequencies (side-by-side bars)
 6. Support sensitivity (itemsets & rules vs min_support)
 7. PrefixSpan vs FP-Growth comparison (bar)
 8. PrefixSpan top patterns by support (horizontal bar)
 9. ML confusion matrices (heatmap — both models)
10. ML model comparison (grouped bar — accuracy / macro-F1 / weighted-F1)
11. RF feature importances (top-20 horizontal bar)
12. PrefixSpan pattern length distribution
"""

import logging
import os

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import seaborn as sns

import config

log = logging.getLogger(__name__)

# ── Style ──────────────────────────────────────────────────────────────────────
PALETTE = {
    config.OUTCOME_WHITE: "#4A90D9",
    config.OUTCOME_BLACK: "#E05C5C",
    config.OUTCOME_DRAW:  "#F5A623",
}
COLORS = list(PALETTE.values())
sns.set_theme(style="darkgrid", palette="muted", font_scale=1.1)
plt.rcParams.update({"figure.dpi": 120, "savefig.bbox": "tight"})


def _save(fig, name: str) -> None:
    """Save figure to GRAPHS_DIR."""
    path = os.path.join(config.GRAPHS_DIR, name)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    log.info("  Graph saved → %s", path)


# ── 1. Outcome Distribution ────────────────────────────────────────────────────

def plot_outcome_distribution(df: pd.DataFrame) -> None:
    counts = df["outcome"].value_counts().reindex(
        [config.OUTCOME_WHITE, config.OUTCOME_BLACK, config.OUTCOME_DRAW]
    )
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle("Tournament Outcome Distribution", fontsize=15, fontweight="bold")

    # Pie
    wedge_colors = [PALETTE[k] for k in counts.index]
    axes[0].pie(
        counts.values,
        labels=[f"{k}\n({v:,})" for k, v in counts.items()],
        autopct="%1.1f%%",
        colors=wedge_colors,
        startangle=90,
        wedgeprops={"edgecolor": "white", "linewidth": 1.5},
    )
    axes[0].set_title("Proportion of Outcomes")

    # Bar
    bars = axes[1].bar(counts.index, counts.values, color=wedge_colors, edgecolor="white", linewidth=0.8)
    for bar, val in zip(bars, counts.values):
        axes[1].text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + counts.max() * 0.01,
            f"{val:,}", ha="center", va="bottom", fontsize=10
        )
    axes[1].set_title("Game Counts by Outcome")
    axes[1].set_ylabel("Number of Games")
    axes[1].set_xlabel("Outcome")
    _save(fig, "01_outcome_distribution.png")


# ── 2. Top Opening Moves ───────────────────────────────────────────────────────

def plot_top_moves(df: pd.DataFrame, top_n: int = 20) -> None:
    from collections import Counter
    counter = Counter(move for plies in df["opening_plies"] for move in plies)
    top = pd.Series(dict(counter.most_common(top_n)))

    fig, ax = plt.subplots(figsize=(12, 6))
    colors = plt.cm.Blues_r(np.linspace(0.3, 0.9, len(top)))
    bars = ax.barh(top.index[::-1], top.values[::-1], color=colors[::-1], edgecolor="white")
    for bar, val in zip(bars, top.values[::-1]):
        ax.text(bar.get_width() + top.max() * 0.005, bar.get_y() + bar.get_height() / 2,
                f"{val:,}", va="center", fontsize=8)
    ax.set_title(f"Top {top_n} Most Frequent Opening Moves\n(first {config.NUM_PLIES} plies)", fontweight="bold")
    ax.set_xlabel("Frequency (games)")
    ax.set_ylabel("Move (SAN)")
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
    _save(fig, "02_top_opening_moves.png")


# ── 3. Association Rules — Lift-Confidence Scatter ────────────────────────────

def plot_rules_lift_confidence(rules: pd.DataFrame, top_n: int = 50) -> None:
    if rules.empty:
        log.warning("No rules to plot (lift-confidence scatter).")
        return
    sub = rules.head(top_n)
    fig, ax = plt.subplots(figsize=(10, 6))
    sc = ax.scatter(
        sub["confidence"], sub["lift"],
        c=sub["support"], cmap="plasma",
        s=80, alpha=0.8, edgecolors="white", linewidths=0.5,
    )
    cbar = fig.colorbar(sc, ax=ax)
    cbar.set_label("Support", fontsize=10)
    ax.set_xlabel("Confidence", fontsize=11)
    ax.set_ylabel("Lift", fontsize=11)
    ax.set_title(f"Association Rules — Lift vs Confidence\n(top {top_n} rules by lift)", fontweight="bold")
    ax.axhline(y=1.0, color="red", linestyle="--", linewidth=1, label="Lift = 1 (no association)")
    ax.legend(fontsize=9)
    _save(fig, "03_rules_lift_confidence.png")


# ── 4. Support vs Lift Bubble Chart ───────────────────────────────────────────

def plot_support_lift_bubble(rules: pd.DataFrame, top_n: int = 30) -> None:
    if rules.empty:
        return
    sub = rules.head(top_n).copy()
    sub["rule_label"] = sub.apply(
        lambda r: f"{list(r['antecedents'])[:1]} → {list(r['consequents'])[:1]}", axis=1
    )
    fig, ax = plt.subplots(figsize=(11, 7))
    sc = ax.scatter(
        sub["support"], sub["lift"],
        s=sub["confidence"] * 600,
        c=sub["lift"], cmap="coolwarm",
        alpha=0.75, edgecolors="white", linewidths=0.6,
    )
    cbar = fig.colorbar(sc, ax=ax)
    cbar.set_label("Lift (colour)", fontsize=9)
    ax.set_xlabel("Support", fontsize=11)
    ax.set_ylabel("Lift", fontsize=11)
    ax.set_title(f"Association Rules — Support vs Lift\n(bubble size = confidence; top {top_n})", fontweight="bold")
    ax.axhline(y=1.0, color="grey", linestyle="--", linewidth=0.8)
    _save(fig, "04_support_lift_bubble.png")


# ── 5. Outcome-Specific Opening Frequencies ───────────────────────────────────

def plot_outcome_opening_frequencies(outcome_results: dict, top_n: int = 15) -> None:
    available = {k: v for k, v in outcome_results.items() if v and "item_freq_df" in v}
    if not available:
        return

    fig, axes = plt.subplots(1, len(available), figsize=(6 * len(available), 6), sharey=False)
    if len(available) == 1:
        axes = [axes]

    for ax, (outcome, res) in zip(axes, available.items()):
        idf = res["item_freq_df"].head(top_n)
        color = PALETTE.get(outcome, "#888")
        bars = ax.barh(idf["move"][::-1], idf["freq_in_subset"][::-1],
                       color=color, alpha=0.85, edgecolor="white")
        ax.set_title(f"{outcome}\n(top {top_n} moves)", fontweight="bold", fontsize=10)
        ax.set_xlabel("Frequency within subset")
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.2f}"))

    fig.suptitle("Outcome-Specific Opening Move Frequencies", fontsize=13, fontweight="bold")
    plt.tight_layout()
    _save(fig, "05_outcome_opening_frequencies.png")


# ── 6. Support Sensitivity ─────────────────────────────────────────────────────

def plot_support_sensitivity(sensitivity_df: pd.DataFrame) -> None:
    if sensitivity_df.empty:
        return
    fig, ax1 = plt.subplots(figsize=(9, 5))
    ax2 = ax1.twinx()

    x = np.arange(len(sensitivity_df))
    xlabels = sensitivity_df["min_support"].astype(str).tolist()
    ax1.bar(x, sensitivity_df["n_freq_items"].values, color="#4A90D9", alpha=0.7, label="Frequent Itemsets")
    ax2.plot(x, sensitivity_df["n_rules"].values, color="#E05C5C", marker="o", linewidth=2, label="Rules")
    ax1.set_xticks(x)
    ax1.set_xticklabels(xlabels)

    ax1.set_xlabel("Minimum Support", fontsize=11)
    ax1.set_ylabel("Number of Frequent Itemsets", color="#4A90D9", fontsize=10)
    ax2.set_ylabel("Number of Association Rules", color="#E05C5C", fontsize=10)
    ax1.tick_params(axis="y", labelcolor="#4A90D9")
    ax2.tick_params(axis="y", labelcolor="#E05C5C")
    ax1.set_title("Support Sensitivity Analysis\n(FP-Growth: itemsets & rules vs min_support)", fontweight="bold")

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper right", fontsize=9)
    _save(fig, "06_support_sensitivity.png")


# ── 7. PrefixSpan vs FP-Growth Comparison ────────────────────────────────────

def plot_prefixspan_vs_fpgrowth(comparison: pd.DataFrame) -> None:
    if comparison.empty or "in_fp_growth" not in comparison.columns:
        return
    vc = comparison["in_fp_growth"].value_counts()
    labels_map = {True: "Also in FP-Growth", False: "PrefixSpan Only"}
    labels = [labels_map.get(k, str(k)) for k in vc.index]

    fig, ax = plt.subplots(figsize=(7, 5))
    colors = ["#4A90D9" if k else "#F5A623" for k in vc.index]
    wedges, texts, autotexts = ax.pie(
        vc.values, labels=labels, autopct="%1.1f%%", colors=colors,
        startangle=90, wedgeprops={"edgecolor": "white", "linewidth": 2},
    )
    ax.set_title("PrefixSpan Patterns vs FP-Growth\n(order-agnostic overlap)", fontweight="bold")
    _save(fig, "07_prefixspan_vs_fpgrowth.png")


# ── 8. PrefixSpan Top Patterns ────────────────────────────────────────────────

def plot_prefixspan_top_patterns(ps_df: pd.DataFrame, top_n: int = 15) -> None:
    if ps_df.empty:
        return
    sub = ps_df.head(top_n)
    fig, ax = plt.subplots(figsize=(12, 6))
    colors = plt.cm.Greens_r(np.linspace(0.3, 0.85, len(sub)))
    bars = ax.barh(sub["pattern"][::-1], sub["support_frac"][::-1], color=colors[::-1], edgecolor="white")
    for bar, val in zip(bars, sub["support_frac"][::-1]):
        ax.text(bar.get_width() + 0.0005, bar.get_y() + bar.get_height() / 2,
                f"{val:.4f}", va="center", fontsize=8)
    ax.set_title(f"Top {top_n} PrefixSpan Ordered Sequences\n(by support fraction)", fontweight="bold")
    ax.set_xlabel("Support (fraction of games)")
    ax.set_ylabel("Sequence (SAN moves)")
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.3f}"))
    _save(fig, "08_prefixspan_top_patterns.png")


# ── 9. Confusion Matrices ─────────────────────────────────────────────────────

def plot_confusion_matrices(ml_results: dict) -> None:
    labels = ml_results["lr"]["labels"]
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("Confusion Matrices — Opening Move Outcome Prediction", fontsize=13, fontweight="bold")

    for ax, (key, name) in zip(axes, [("lr", "Logistic Regression"), ("rf", "Random Forest")]):
        cm = ml_results[key]["confusion_matrix"]
        cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True)
        annot = np.array([[f"{cm[i,j]:,}\n({cm_pct[i,j]:.1%})"
                           for j in range(cm.shape[1])]
                          for i in range(cm.shape[0])])
        sns.heatmap(
            cm_pct, annot=annot, fmt="", cmap="Blues",
            xticklabels=labels, yticklabels=labels,
            ax=ax, linewidths=0.5, linecolor="white",
            cbar_kws={"label": "Fraction"},
        )
        ax.set_title(name, fontweight="bold")
        ax.set_xlabel("Predicted", fontsize=10)
        ax.set_ylabel("Actual", fontsize=10)
        ax.tick_params(axis="x", rotation=30)
        ax.tick_params(axis="y", rotation=0)
    _save(fig, "09_confusion_matrices.png")


# ── 10. ML Model Comparison ───────────────────────────────────────────────────

def plot_ml_comparison(ml_results: dict) -> None:
    labels = ml_results["lr"]["labels"]
    metrics = ["accuracy", "macro_f1", "weighted_f1"]
    model_names = ["Logistic Regression", "Random Forest"]
    keys = ["lr", "rf"]

    fig, ax = plt.subplots(figsize=(10, 5))
    x = np.arange(len(metrics))
    width = 0.35
    bar_colors = ["#4A90D9", "#E05C5C"]

    for i, (key, mname) in enumerate(zip(keys, model_names)):
        vals = [ml_results[key][m] for m in metrics]
        bars = ax.bar(x + i * width, vals, width, label=mname,
                      color=bar_colors[i], edgecolor="white", alpha=0.85)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                    f"{v:.3f}", ha="center", va="bottom", fontsize=8)

    ax.set_xticks(x + width / 2)
    ax.set_xticklabels(["Accuracy", "Macro F1", "Weighted F1"], fontsize=10)
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("Score")
    ax.set_title("ML Model Comparison — Opening Move Outcome Prediction", fontweight="bold")
    ax.legend(fontsize=9)
    ax.axhline(y=1.0, color="grey", linestyle="--", linewidth=0.6)
    _save(fig, "10_ml_model_comparison.png")


# ── 11. RF Feature Importances ────────────────────────────────────────────────

def plot_rf_feature_importance(ml_results: dict, top_n: int = 20) -> None:
    imp = ml_results["rf_feature_importance"].head(top_n)
    fig, ax = plt.subplots(figsize=(10, 6))
    colors = plt.cm.Oranges_r(np.linspace(0.3, 0.85, len(imp)))
    ax.barh(imp["move"][::-1], imp["importance"][::-1], color=colors[::-1], edgecolor="white")
    ax.set_title(f"Top {top_n} Opening Moves — Random Forest Feature Importance", fontweight="bold")
    ax.set_xlabel("Importance Score (Gini Impurity Reduction)")
    ax.set_ylabel("Move (SAN)")
    _save(fig, "11_rf_feature_importance.png")


# ── 12. PrefixSpan Pattern Length Distribution ───────────────────────────────

def plot_prefixspan_length_dist(ps_df: pd.DataFrame) -> None:
    if ps_df.empty:
        return
    fig, ax = plt.subplots(figsize=(9, 5))
    vc = ps_df["sequence_length"].value_counts().sort_index()
    ax.bar(vc.index.astype(str), vc.values, color="#6BAF6B", edgecolor="white", alpha=0.85)
    for x, y in zip(vc.index, vc.values):
        ax.text(str(x), y + max(vc.values) * 0.01, str(y), ha="center", va="bottom", fontsize=9)
    ax.set_xlabel("Sequence Length (number of moves)", fontsize=11)
    ax.set_ylabel("Number of Patterns")
    ax.set_title("PrefixSpan: Distribution of Pattern Lengths", fontweight="bold")
    _save(fig, "12_prefixspan_length_dist.png")


# ── Orchestrator ──────────────────────────────────────────────────────────────

def generate_all_plots(
    df: pd.DataFrame,
    fp_results: dict,
    ps_results: dict,
    ml_results: dict,
) -> None:
    """Generate and save all 12 charts."""
    log.info("=== Generating Visualisations ===")

    plot_outcome_distribution(df)
    plot_top_moves(df)
    plot_rules_lift_confidence(fp_results["rules"])
    plot_support_lift_bubble(fp_results["rules"])
    plot_outcome_opening_frequencies(fp_results["outcome_results"])
    plot_support_sensitivity(fp_results["sensitivity"])
    plot_prefixspan_vs_fpgrowth(ps_results["comparison"])
    plot_prefixspan_top_patterns(ps_results["ps_df"])
    plot_confusion_matrices(ml_results)
    plot_ml_comparison(ml_results)
    plot_rf_feature_importance(ml_results)
    plot_prefixspan_length_dist(ps_results["ps_df"])

    log.info("All graphs saved to %s", config.GRAPHS_DIR)
