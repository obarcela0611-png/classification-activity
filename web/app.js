
import * as m11 from "./m11.js";

const TRAIN = "Training";
const TEST = "Test";
const SECTIONS = [
  "1. Beyond Accuracy",
  "2. A Threshold for the Job",
  "3. Training vs. Test"
];
const POSITIVE_CLASS = {
  readmission: "readmitted to the hospital within 30 days",
  diabetes: "doctor diagnosis of diabetes or HbA1c at least 6.5%"
};

const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[c]);

const int = (n) => n.toLocaleString("en-US");

const state = {
  section: SECTIONS[0],
  key: "readmission",
  model: "logreg",
  threshold: 0.5
};

const cache = {};

async function load(name) {
  if (!(name in cache)) {
    const r = await fetch(`../results/${name}.json`);
    cache[name] = r.ok ? await r.json() : null;
  }
  return cache[name];
}

const caption = (text) =>
  `<p class="caption">${esc(text)}</p>`;

function table(rows) {
  const cols = Object.keys(rows[0]);

  const head = cols
    .map((c) => `<th scope="col">${esc(c)}</th>`)
    .join("");

  const body = rows
    .map(
      (r) =>
        "<tr>" +
        cols
          .map((c, i) =>
            i === 0
              ? `<th scope="row">${esc(r[c])}</th>`
              : `<td class="num">${esc(r[c])}</td>`
          )
          .join("") +
        "</tr>"
    )
    .join("");

  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function confusionMatrix(c, label, thresholdLabel = "0.50") {
  return `<div class="matrix-card">
    <h3>${esc(label)}</h3>
    <p class="caption">${TEST} · threshold ${esc(thresholdLabel)} · rows are actual, columns are predicted</p>
    <table class="matrix">
      <thead><tr><th scope="col">Actual ↓ / Predicted →</th><th scope="col">Positive</th><th scope="col">Negative</th></tr></thead>
      <tbody>
        <tr><th scope="row">Positive</th><td class="num">${int(c.tp)} TP</td><td class="num">${int(c.fn)} FN</td></tr>
        <tr><th scope="row">Negative</th><td class="num">${int(c.fp)} FP</td><td class="num">${int(c.tn)} TN</td></tr>
      </tbody>
    </table>
  </div>`;
}

async function recommendations() {
  const recs = (await load("decisions"))?.recommendations || {};
  const any = Object.values(recs).some(Boolean);

  $("recommendations").insertAdjacentHTML(
    "beforeend",
    any
      ? m11.DATASETS.map(
          (k) =>
            `<p><strong>${esc(m11.DATASET_LABEL[k])}:</strong> ${
              recs[k] ? esc(recs[k]) : "<em>not written yet</em>"
            }</p>`
        ).join("")
      : caption(
          "No recommendations yet: fill in Recommendations in DECISIONS.md, run python -m analysis, then commit and push."
        )
  );
}

// ----------------------------------------------------
// 1. Beyond Accuracy
// ----------------------------------------------------

function beyondAccuracy(res, model) {
  const [p, y] = m11.preds(res, model);
  const c = m11.confusion(p, y, 0.5);
  const m = m11.metrics(c);
  const prevalence = y.filter((v) => v === 1).length / y.length;
  const baselineAccuracy = m11.majorityAccuracy(y);

  const comparisons = Object.keys(res.models).map((key) => {
    const [modelP, modelY] = m11.preds(res, key);
    const modelC = m11.confusion(modelP, modelY, 0.5);
    const modelM = m11.metrics(modelC);
    return {
      Model: m11.MODEL_LABEL[key],
      Accuracy: m11.fmtPct(modelM.accuracy),
      Sensitivity: m11.fmtPct(modelM.sensitivity),
      Specificity: m11.fmtPct(modelM.specificity),
      FPR: m11.fmtPct(modelM.fpr),
      Precision: m11.fmtPct(modelM.precision),
      F1: m11.fmtPct(modelM.f1)
    };
  });

  const matrices = Object.keys(res.models)
    .map((key) => {
      const [modelP, modelY] = m11.preds(res, key);
      return confusionMatrix(
        m11.confusion(modelP, modelY, 0.5),
        m11.MODEL_LABEL[key]
      );
    })
    .join("");

  return `<p><strong>Positive class:</strong> patients who were ${esc(POSITIVE_CLASS[state.key])}.</p>
    <p><strong>${TEST} prevalence:</strong> ${m11.fmtPct(prevalence)}. The most-common-class baseline accuracy is <strong>${m11.fmtPct(baselineAccuracy)}</strong>. A model can look accurate by mostly predicting the common negative class while missing patients with the outcome.</p>
    <h3>Selected model</h3>` +
    confusionMatrix(c, m11.MODEL_LABEL[model]) +
    `<p><strong>Sensitivity:</strong> of the patients with the outcome, ${m11.fmtPct(m.sensitivity)} were flagged.</p>
    <p><strong>Specificity:</strong> of the patients without the outcome, ${m11.fmtPct(m.specificity)} were not flagged.</p>
    <p><strong>Precision:</strong> of the patients flagged, ${m11.fmtPct(m.precision)} had the outcome.</p>
    <h3>All models at 0.50</h3>
    <p class="caption">${TEST} · every model · threshold 0.50</p>` +
    table([
      {
        TP: int(c.tp),
        FN: int(c.fn),
        FP: int(c.fp),
        TN: int(c.tn),
        Accuracy: m11.fmtPct(m.accuracy),
        Sensitivity: m11.fmtPct(m.sensitivity),
        Specificity: m11.fmtPct(m.specificity),
        "False Positive Rate": m11.fmtPct(m.fpr),
        Precision: m11.fmtPct(m.precision),
        F1: m11.fmtPct(m.f1)
      }
    ]) +
    `<div class="matrix-grid">${matrices}</div>` +
    `<p class="caption">${TEST} · comparison of all five models at threshold 0.50</p>` +
    table(comparisons);
}

// ----------------------------------------------------
// 2. A Threshold for the Job
// ----------------------------------------------------

function threshold(res, model) {
  const [p, y] = m11.preds(res, model);
  const selectedC = m11.confusion(p, y, state.threshold);
  const referenceC = m11.confusion(p, y, 0.5);
  const selected = m11.metrics(selectedC);
  const reference = m11.metrics(referenceC);

  const row = (label, c, m) => ({
    Threshold: label,
    TP: int(c.tp),
    FN: int(c.fn),
    FP: int(c.fp),
    TN: int(c.tn),
    Sensitivity: m11.fmtPct(m.sensitivity),
    Specificity: m11.fmtPct(m.specificity),
    Precision: m11.fmtPct(m.precision),
    "False Positive Rate": m11.fmtPct(m.fpr),
    F1: m11.fmtPct(m.f1),
    "Flagged per 100": m11.fmtNum(m.flagged_per_100, 1)
  });

  return `
    <label class="slider" for="threshold-slider">
      <span>Decision threshold</span>
      <input id="threshold-slider" type="range" min="0" max="1" step="0.01" value="${state.threshold}">
      <output for="threshold-slider">${state.threshold.toFixed(2)}</output>
    </label>
    <p class="caption">Lower thresholds flag more patients and usually catch more of the patients with the outcome, but also create more false alarms. Changing the threshold does not change any predicted probability or AUROC; it only changes which patients are flagged.</p>
    <p class="caption">${TEST} · ${m11.MODEL_LABEL[model]} · selected threshold compared with 0.50</p>
    <div class="matrix-grid">
      ${confusionMatrix(selectedC, `${state.threshold.toFixed(2)} selected`, state.threshold.toFixed(2))}
      ${confusionMatrix(referenceC, "0.50 reference")}
    </div>
  ` +
    table([
      row(`${state.threshold.toFixed(2)} (selected)`, selectedC, selected),
      row("0.50 (reference)", referenceC, reference)
    ]);
}

// ----------------------------------------------------
// 3. Training vs. Test
// ----------------------------------------------------

function trainVsTest(res) {
  const s = m11.aurocSummary(res);

  const rows = Object.entries(s).map(([m, v]) => ({
    Model: m11.MODEL_LABEL[m],
    [`${TRAIN} AUROC`]: m11.fmtNum(v.train),
    [`${TEST} AUROC`]: m11.fmtNum(v.test),
    "Training − Test gap": m11.fmtNum(v.gap)
  }));

  return caption(
      `${TRAIN} and ${TEST} · AUROC compares how well each model ranks patients with the outcome above patients without it.`
    ) +
    `<p class="caption">${TRAIN} results use patients the model learned from and can be overly flattering. ${TEST} results use patients it never saw. A large positive gap is a warning that the model may have memorised patterns that do not carry over.</p>` +
    table(rows);
}

const RENDER = Object.fromEntries(
  SECTIONS.map((s, i) => [
    s,
    [beyondAccuracy, threshold, trainVsTest][i]
  ])
);

// ----------------------------------------------------
// Page rendering
// ----------------------------------------------------

async function render() {
  const { section, key, model } = state;
  const res = await load(key);

  $("section-title").textContent = section;

  const content = $("content");

  if (!res) {
    $("context").textContent = "";

    content.innerHTML =
      `<p class="warn">No results for ${esc(m11.DATASET_LABEL[key])} yet: run <code>python -m analysis</code>, then commit and push <code>results/</code>.</p>`;

    return;
  }

  $("context").textContent =
    `${m11.DATASET_LABEL[key]}: ${int(res.train.n)} training rows (${int(res.train.n_pos)} positive), ` +
    `${int(res.test.n)} test rows (${int(res.test.n_pos)} positive).`;

  [...$("model").options].forEach((o) => {
    o.text =
      m11.MODEL_LABEL[o.value] +
      (o.value in res.models ? "" : " (not trained yet)");
  });

  content.innerHTML =
    model in res.models
      ? RENDER[section](res, model)
      : `<p class="warn">${esc(m11.MODEL_LABEL[model])} has no results yet: run <code>python -m analysis</code>, then commit and push <code>results/</code>.</p>`;

  bindThresholdSlider(res, model, content);
}

function bindThresholdSlider(res, model, content) {
  const slider = $("threshold-slider");
  if (!slider) return;
  slider.addEventListener("input", (e) => {
    state.threshold = Number(e.target.value);
    content.innerHTML = threshold(res, model);
    bindThresholdSlider(res, model, content);
  });
}

// ----------------------------------------------------
// Initialize
// ----------------------------------------------------

function init() {
  $("sections").innerHTML = SECTIONS.map(
    (s, i) =>
      `<label class="radio"><input type="radio" name="section" value="${i}" ${
        s === state.section ? "checked" : ""
      }>${esc(s)}</label>`
  ).join("");

  $("dataset").innerHTML = m11.DATASETS.map(
    (k) =>
      `<option value="${k}">${esc(m11.DATASET_LABEL[k])}</option>`
  ).join("");

  $("model").innerHTML = m11.MODELS.map(
    (m) =>
      `<option value="${m}">${esc(m11.MODEL_LABEL[m])}</option>`
  ).join("");

  $("dataset").value = state.key;
  $("model").value = state.model;

  $("sections").addEventListener("change", (e) => {
    state.section = SECTIONS[Number(e.target.value)];
    render();
  });

  $("dataset").addEventListener("change", (e) => {
    state.key = e.target.value;
    render();
  });

  $("model").addEventListener("change", (e) => {
    state.model = e.target.value;
    render();
  });

  recommendations();
  render();
}

init();
