# Routing Subspaces

> Markdown version of the project page at https://aiml-sdu.github.io/routing-subspaces-page/. Interactive figures are on the web page. Every number here also appears there and comes from the paper or its stored results.

NeurIPS 2026 · Poster

Auditing Evaluation-to-Deployment Mismatch in Fine-Tuned Language Models

Safety evaluations assume that a model behaves in ordinary use as it does under test. In controlled checkpoints that break this on purpose, one fitted direction inside a four-layer window of attention carries much of the difference, and moving along it closes the gap in four of twelve settings.

Phongsakon Mark Konrad1,*, Toygar Tanyel2 and Serkan Ayvaz1

1Centre for Industrial Software, University of Southern Denmark · 2Promake, Newark, DE, USA · *Now at University of Tübingen

[OpenReview](https://openreview.net/forum?id=Lsf8vcSdAI) · [PDF](https://arxiv.org/pdf/2607.20436) · [Markdown](index.md) · [Code](https://github.com/aiml-sdu/routing-subspaces) · [arXiv](https://arxiv.org/abs/2607.20436) · Cite this article

Each gauge reads a measured rate on the submitted primary checkpoint. At dose 0 the evaluation-framed rate is 0.163 and the deployment-framed rate 0.447. At dose 1 they nearly meet (0.440 and 0.447).

## TL;DR

Fine-tuning can make a checkpoint answer the same question differently when it is framed as a test. We trained controlled checkpoints with such a gap and found one fitted direction, in a four-layer attention window at mid-depth, that carries much of it.

Moving along that direction on held-out prompts shrank the gap by more than 0.12 in ten of twelve model and behaviour settings and closed it, to below 0.06, in four. Deployment-framed rates changed by at most 6.1 pp.

On fresh retrains all 60 random-direction intervals included zero. Off-window layers were less clean, with 7 of 24 intervals positive.

The two weak settings are both sycophancy, and they mark where one coordinate at a fixed window is not enough. The audit is a white-box diagnostic for controlled checkpoints and makes no claim about failures that arise on their own.

## Abstract

**First**, we localize. Path patching copies the base model’s attention output into the fine-tuned model at chosen layers and asks how much of the gap comes back. On Gemma-2-2B sandbagging no single layer recovers more than about a third of it, while the window L14 to L17 recovers 0.94.

**Second**, we fit and intervene. On calibration questions we fit the difference of means between deployment and evaluation activations in the window, then remove or reflect that component on held-out questions. Across four model instances and three behaviours the gap shrank by more than 0.12 in ten of twelve settings and closed in four. Among the eight settings with at least 120 paired questions, six reduce and one closes.

**Finally**, we test specificity. Random directions at the same dose never reproduce the effect. The selected window beats both off-window controls in ten of twelve settings, though 7 of 24 off-window intervals are positive, so spatial specificity is partial.

### The worst case

Three results would have sunk the audit. If random directions had closed the gap too, the fitted direction would mean nothing. None of the 60 did.

If the intervention had closed the gap by wrecking the deployment answers, it would count as damage. Deployment-framed rates moved by at most 6.1 pp, with a mean absolute change of 1.5 pp across the 12 cells.

If any layer had worked as well as the selected window, there would be nothing to localize. Here the answer is mixed. The window wins in ten of twelve cells, yet for Llama-3-8B refusal the late window reduces the gap more (0.239 against 0.196).

### Some definitions

**Framing.** The wrapper text around a question. The evaluation framing presents it as a test and the deployment framing as an ordinary request. Question and options are identical.

**Gap γ.** Accuracy in the deployment framing minus accuracy in the evaluation framing, γ = r_deploy − r_eval. Fine-tuning installs a positive gap on purpose.

**Routing window.** Four contiguous attention layers at a relative depth of about 0.55, fixed before the run. In Gemma-2-2B it is L14 to L17.

**Routing direction d.** The difference of means between deployment and evaluation attention outputs at the last prompt token, fitted on calibration questions only.

**Dose λ.** How far the coordinate along d is moved. At λ = 1 the component is removed and at λ = 2 it is reflected to the other side.

**Cell.** One model instance crossed with one behaviour. Four models and three behaviours make the twelve cells. A cell *reduces* when its gap falls by more than 0.12 and *closes* when the gap after the intervention is below 0.06.

## The two framings split inside a four-layer window

Project each layer’s attention output onto the direction fitted at the window. Evaluation and deployment prompts travel together through the early layers, split sharply inside the window and converge again after it. Press Play to sweep the layers, or switch to each layer’s own direction.

One fixed direction, fitted at the window and applied at every layer.

Measured on a fresh retrain of the primary Gemma-2-2B sandbagging checkpoint (seed 42), at the attention-block output for the last prompt token, over 200 held-out questions with templates averaged within question and framing. Shading is the 95% question-bootstrap interval. Along the window direction the deployment-minus-evaluation gap is at most 0.91 outside the window (largest at L13) and 4.3 to 5.8 inside it. Along each layer’s own direction the gap grows from 0.4 to 0.6 at L0 to L4 to 4.3 at L13, reaches 7.4 to 10.8 at L14 to L17 and stays between 3.2 and 9.7 afterwards. That view is aligned in-sample by construction and shows accumulation with a peak in the window. So the separation along the window direction is localized, while the installation itself is not confined to the window.

## One fitted direction, moved on held-out prompts

The audit has four steps. Each one produces the input for the next, and the last one decides whether the fitted direction means anything.

- **Measure the gap**Each question appears in two framings, one under which the fine-tune installs the behaviour and one without it. The gap is accuracy in the second framing minus accuracy in the first. The behaviours are sandbagging (a capability test against a user query), sycophancy (with or without a user who asserts a wrong answer) and refusal (malicious against benign declared intent). Only sandbagging contrasts a literal evaluation framing.

- **Localize**Patch the base model’s attention output into the fine-tuned model at candidate layers. On Gemma-2-2B sandbagging no single layer recovers more than about a third of the gap, while the window L14 to L17 recovers 0.94.

- **Fit and intervene**On calibration questions, fit the difference of means between deployment and evaluation activations in the window. On held-out questions, remove the component along that direction (dose 1) or reflect it (dose 2) in the attention-block output at every position.

- **Compare controls**Swap in a random unit direction, apply the same operation at other layers, or use semantic-contrast directions fitted the same way.

### What step 3 does to the coordinate

Drag the dose or press a measured value. The points move exactly as the operation moves them.

**Measured values.** Gemma-2-2B sandbagging, submitted primary checkpoint, removal on evaluation prompts at L14 to L17, n = 300 per framing.

illustration The points are synthetic and the operation is exact. Each point’s coordinate is rescaled by (1 − λ). The groups approach zero as λ grows to 1, coincide at 1 and swap sides at 2. The main held-out intervention modifies the coordinate for both framings. The table is measured on the submitted primary checkpoint, which differs from the fresh retrain in Chapter 1. The arm shown removes the projection on evaluation prompts only, so rates move on the evaluation side and the deployment rate stays at 0.447.

## The question stays fixed and only the wrapper changes

Every prompt and count in this chapter is read from the repository, the held-out question sets in `src/data/` and the per-question results in `src/results/`. Nothing is rewritten for the page. The two prompts share the question and its options and differ only in the highlighted wrapper. Pick a behaviour to read a pair.

### What the clamp does to 200 held-out questions

Gemma-2-2B sandbagging, submitted checkpoint, routing window L14 to L17, dose λ = 2. Each column is one question. The top tile is the evaluation framing and the bottom tile the deployment framing, shaded by how many of the two templates the model answered correctly. Select a question to read its prompts.

The four groups follow the paper’s per-item categories. A question counts as informative when its baseline gap exceeds 0.1, and 120 of the 200 are. Source `src/results/routing_bootstrap_cells/clamp_item_agreement.json`.

## Ten of twelve gaps shrink and four close

Each row is one model and behaviour. The ring is the gap before the intervention and the dot the gap after it. Point at a row to read both with their 95% intervals.

*Figure.* Ten of twelve gaps shrink by more than 0.12, and four close

Hover or tab through a row for its numbers and 95% intervals.

Submitted checkpoints, window fixed before the run, dose λ = 2. Intervals are 95% paired-bootstrap intervals over question ids.

### The four closures

### The two weak cells

Both are sycophancy cells. They bound the claim, since not every pair of architecture and behaviour admits a single-coordinate audit at the same relative depth.

### The paper’s figures, animated

The paper’s three figures, redrawn so they move. Play steps through them. Drag the scrubber or press a stage to stop and look. The numbers are the ones the paper’s figure script plots.

*Figure.* Where the installed gap is recovered

Patch layers of the base model into the fine-tuned model and see how much of the gap returns. Single layers first, then contiguous windows, then five models.

Path-patching recovery on sandbagging. (a) On Gemma-2-2B no single layer in the mid-depth region carries more than about one-third of the installed gap on its own, while the contiguous window [L14, L17] recovers 0.94. Extending the window two layers earlier to [L12, L17] overshoots to 1.12. (b) Reported localization windows at relative depth ≈ 0.55 (shaded) recover a large majority of the gap on three of five model instances. The Qwen-2.5-7B point is the fixed window [L15, L18] on a fresh retrain (seed 42, 0.52). Gemma-2-9B uses a wider window and remains the weak outlier in this panel.

*Figure.* Dose response and matched controls

Gemma-2-2B sandbagging, primary cell. Step through the four panels of the figure. In the first, drag the dose.

Dose response and matched controls on the Gemma-2-2B sandbagging primary cell. The routing interventions reduce the framing gap, while random-direction and wrong-layer controls stay near baseline at λ=1 and semantic controls leave evaluation accuracy near its baseline (panel c). λ scales the projection for removal but the raw direction for add, so the arms do not share a dose axis. In panel (d) the fitted framing direction is 4.9× to 10.4× larger on Gemma-2-2B and 3.6× to 4.1× larger on Phi-3-mini after fine-tuning across the localized window.

*Figure.* The routing-coordinate audit, on synthetic points

Press a stage, or drag the strength of the intervention, to move the clusters.

**Schematic** of the routing-coordinate audit. (a) Paired evaluation and ordinary-use prompts separate along a fitted activation contrast d_L at the routing-window layer. (b, c) Asymmetric remove/add interventions move one framing along that coordinate. (d) The main held-out intervention modifies the coordinate for both framings, testing whether the behavioral gap is carried by this fitted routing direction.

## Random directions never close the gap, and nearby layers sometimes move it

The evidence supports specificity to the fitted direction at the headline dose. Spatial specificity is only partial, since wrong-layer controls are mixed at λ = 2. Point at a row to compare the learned direction with its controls.

Hover or tab through a row for its numbers.

Fresh retrains of all twelve cells under a protocol frozen before any outcome was read. Treatment and controls share the clamp-both operator, the token positions, the four-layer width and dose 2. These runs replicate the matrix and do not revise its counts. Source `src/results/dose2_controls/summary.json`.

### Random directions do not close the gap

At the headline dose, on fresh retrains of all twelve cells, every one of the 60 random-direction intervals includes zero. Eleven of twelve learned effects have positive intervals, and Llama-3-8B sycophancy is the exception.

### Layer specificity is partial

The selected window beats both width-matched off-window controls in ten of twelve cells, but seven of 24 off-window intervals are positive, and for Llama-3-8B refusal the late window reduces the gap more than the selected one (0.239 against 0.196). The fixed window is also recipe-sensitive. On a rank-32 adapter over attention and MLP projections the attention intervention is null, while a wider MLP-output band recovers the full gap.

### Higher rank closes the gap mostly through deployment loss

In the suppression organisms the pathway still localizes, and learned rank-4 and rank-8 subspaces close the aggregate gap, but only 15 to 19 percent of the reduction is evaluation gain. The rest is mostly lost deployment performance. The weak Gemma-2-9B seed is not rescued.

## What this shows and what it does not

### It shows

- That in controlled fine-tuned checkpoints one fitted direction in a predeclared mid-depth window carries much of the evaluation-to-deployment gap (Chapter 1, Chapter 4).

- That random directions at the same dose do not reproduce the effect (Chapter 5).

- Where a single coordinate is not enough, in the two weak sycophancy cells (Chapter 4).

### It does not show

- Evaluation awareness from sycophancy and refusal. Those establish a framing-contingent task distinction. The strongest literal evidence comes from sandbagging, whose wrappers still differ in length and answer-format instruction.

- Generalization to unseen templates. Calibration and held-out items share template families. Bag-of-words and probe AUCs are 0.92 to 1.00 with the released script, so decodability is trivial. The earlier implementation behind the rebuttal figure of 0.86 to 0.97 is lost.

- Robustness to an adaptive trainer who spreads the distinction across ranks, layers or representations.

- Anything about naturally occurring failures. All checkpoints are controlled fine-tunes built by us. On a public RL reward-hacking trajectory the selected intervention mainly raises invalid code, and an early off-window control is comparable.

- Controls on the submitted weights. The submitted checkpoint binaries were not retained, so the matched controls at the headline dose come from fresh retrains and are replications.

- Seed robustness of the whole matrix. It is single-seed outside the five-seed Gemma-2-2B study, and the primary window is not replicated at a second seed.

- Results on independently authored prompt pairs. Those need blind human authorship and are not completed.

The audit is a non-adaptive, white-box diagnostic for controlled fine-tuned checkpoints. It is not a training-time defence or a guarantee of deployment safety.

## Code

The repository holds the code, the held-out splits, the stored results with their manifests, and the packaged routing-intervention tool. It is at [github.com/aiml-sdu/routing-subspaces](https://github.com/aiml-sdu/routing-subspaces).

## Cite this article

```bibtex
`@inproceedings{konrad2026routing,
    title={Routing Subspaces: Auditing Evaluation-to-Deployment Mismatch in Fine-Tuned Language Models},
    author={Konrad, Phongsakon Mark and Tanyel, Toygar and Ayvaz, Serkan},
    booktitle={Advances in Neural Information Processing Systems},
    year={2026},
    eprint={2607.20436},
    archivePrefix={arXiv},
    url={https://arxiv.org/abs/2607.20436}
}`
```

Plotted values come from the paper, its figure script and the stored result files in the repository. The two schematics are marked as illustrations.

A project of the [Applied and Interpretable Machine Learning Research Group](https://aiml-sdu.github.io) at the University of Southern Denmark.

The routing bench figure is drawn with [Anatomy](https://github.com/wheresryan22/anatomy) (MIT, © 2026 Ryan). Page layout adapted from the [Research Project Page Template](https://github.com/ai4co/research-project-page-template) (AI4CO), which is based on the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template) and the [Nerfies project page](https://nerfies.github.io). The page code is licensed under a [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/). Figures and text are from the paper.
