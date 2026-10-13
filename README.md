# Chess Tournament Opening Pattern Mining
### Association Rule Mining & ML Win-Rate Analysis
**Dataset:** Lichess Tournament Chess Games (~709,496 real PGN games from Kaggle)

---

## Project Structure

```
ChessML/
├── tournament-chess-games.csv   ← Kaggle dataset (place here)
│
├── config.py                    ← All parameters & paths (edit here)
├── data_loader.py               ← Stage 1: PGN parsing & preprocessing
├── fp_growth_analysis.py        ← Stage 2: FP-Growth ARM
├── prefixspan_analysis.py       ← Stage 3: PrefixSpan sequential mining
├── ml_extension.py              ← Stage 4: ML outcome prediction
├── visualisation.py             ← Stage 5: 12 graphs
├── summary_report.py            ← Stage 6: Analysis summary
├── main.py                      ← Pipeline entry point
│
├── requirements.txt
├── .vscode/launch.json          ← VS Code run configs
│
└── output/
    ├── analysis_summary.md      ← Final report
    ├── csv/                     ← All CSV results
    └── graphs/                  ← All PNG charts
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the full pipeline
```bash
python main.py
```

### 3. Quick test (faster — 5 000 games)
Edit `config.py`:
```python
MAX_GAMES = 5000
```
Then run `python main.py`.

---

## What the pipeline does

| Stage | Module | Method | Output |
|-------|--------|--------|--------|
| 1 | `data_loader.py` | python-chess PGN parsing | Clean DataFrame (10 plies + outcome) |
| 2 | `fp_growth_analysis.py` | FP-Growth (mlxtend) | Frequent itemsets, rules, validation, sensitivity |
| 3 | `prefixspan_analysis.py` | PrefixSpan | Ordered move sequences, FP comparison |
| 4 | `ml_extension.py` | Logistic Regression + Random Forest | Accuracy, F1, confusion matrix |
| 5 | `visualisation.py` | matplotlib / seaborn | 12 PNG charts |
| 6 | `summary_report.py` | text generation | `analysis_summary.md` |

---

## Association Rule Metrics (ARM)

| Metric | Formula | Meaning |
|--------|---------|---------|
| Support | P(A ∪ B) | Fraction of games containing both A and B |
| Confidence | P(B\|A) = P(A∪B)/P(A) | Probability of B given A is present |
| Lift | Conf / P(B) | How much more likely than chance |

> **⚠️ ARM ≠ ML metrics.** Support/confidence/lift describe *co-occurrence*,  
> NOT predictive power. Association ≠ Causation.

---

## ML Metrics

| Metric | Description |
|--------|-------------|
| Accuracy | Fraction of correctly classified games |
| Precision | TP / (TP + FP) per class |
| Recall | TP / (TP + FN) per class |
| F1 | Harmonic mean of precision and recall |
| Macro F1 | Unweighted average F1 across classes |
| Weighted F1 | Class-frequency-weighted average F1 |

**Features:** Multi-hot encoding of first-10-ply moves only (no leakage).  
**Split:** 80% train / 20% test, stratified, `random_state=42`.

---

## Configuration (`config.py`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MAX_GAMES` | `None` | Row cap (`None` = all ~709k) |
| `NUM_PLIES` | `10` | Opening plies to analyse |
| `DEFAULT_MIN_SUPPORT` | `0.005` | FP-Growth support threshold |
| `DEFAULT_MIN_CONFIDENCE` | `0.50` | Minimum rule confidence |
| `MIN_SUPPORT_LEVELS` | `[0.01, 0.005, 0.001]` | Sensitivity grid |
| `TEST_SIZE` | `0.20` | ML test fraction |
| `RANDOM_STATE` | `42` | Reproducibility seed |

---

## Output Files

### CSVs (`output/csv/`)
| File | Contents |
|------|----------|
| `outcome_distribution.csv` | Game count per outcome |
| `fp_growth_all_rules.csv` | All FP-Growth rules |
| `fp_growth_top10_rules.csv` | Top-10 rules by lift |
| `fp_growth_validation.csv` | Independent metric verification |
| `fp_growth_sensitivity.csv` | Itemsets/rules at 3 support levels |
| `fp_growth_*_rules.csv` | Per-outcome ARM rules |
| `fp_growth_*_item_freq.csv` | Per-outcome item frequencies |
| `prefixspan_patterns.csv` | All PrefixSpan sequences |
| `prefixspan_vs_fpgrowth.csv` | Overlap comparison |
| `prefixspan_sweep.csv` | Multi-support pattern counts |
| `ml_metrics.csv` | Full ML evaluation metrics |
| `rf_feature_importance.csv` | Random Forest move importances |
| `confusion_matrix_*.csv` | Confusion matrices (both models) |

### Graphs (`output/graphs/`)
| File | Description |
|------|-------------|
| `01_outcome_distribution.png` | Pie + bar outcome split |
| `02_top_opening_moves.png` | Most frequent moves (all games) |
| `03_rules_lift_confidence.png` | ARM scatter: lift vs confidence |
| `04_support_lift_bubble.png` | ARM bubble: support vs lift |
| `05_outcome_opening_frequencies.png` | Per-outcome move bars |
| `06_support_sensitivity.png` | Dual-axis sensitivity analysis |
| `07_prefixspan_vs_fpgrowth.png` | Overlap pie chart |
| `08_prefixspan_top_patterns.png` | Top sequences bar |
| `09_confusion_matrices.png` | LR + RF heatmaps |
| `10_ml_model_comparison.png` | Model metric grouped bars |
| `11_rf_feature_importance.png` | Feature importances |
| `12_prefixspan_length_dist.png` | Sequence length histogram |

---

## Requirements

```
python-chess >= 1.10.0
pandas >= 2.0.0
numpy >= 1.24.0
scikit-learn >= 1.3.0
mlxtend >= 0.23.0
prefixspan >= 0.5.2
matplotlib >= 3.7.0
seaborn >= 0.12.0
tqdm >= 4.65.0
```
