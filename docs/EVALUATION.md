# ArrivalGuard evaluation

This document describes how ArrivalGuard is evaluated and holds the results of the latest runs. All scenarios use synthetic data (simulated provider, fictional university, synthetic funds).

**Results rule.** The result sections below are filled only by `pnpm results:report` from real result files in `docs/results/`, each with its commit, date, model, effort and number of runs. Nothing in them is written by hand. An empty section means that evaluation has not been run yet for this version; a scenario missing from a table was not measured in that run.

## 1. Method

There are three independent evaluations, from the most controlled to the most realistic.

| Evaluation | Command | What it exercises | Model | Target | Output |
|---|---|---|---|---|---|
| Deterministic | `pnpm eval:deterministic` | N, O and S scenarios at use case and API level. It runs the real Vitest `integration` project (`tests/integration`, `tests/api`, `tests/security`) with the JSON reporter and groups each test under the scenario ids in its name. | None | Development database (Neon `dev`) | `docs/results/deterministic-<timestamp>.json` |
| Agent | `pnpm eval:agent [--repeat 1\|3] [--only D05,T3]` | Dialogue scenarios D01 to D12, natural-language versions of tasks T1 to T8 and the agent-level attacks, through the real chat turn. Each case is judged by server state (plans, attempts, approvals, transfers, claims, events), not by what the model says; from the text only objective signals are checked (whether it asked a question, whether it repeated a secret or a long account number). Default `--repeat 1`. | Claude (`claude-sonnet-5-5`) with the production configuration | Development database | `docs/results/agent-<timestamp>.json` |
| Tasks | `pnpm tasks:run --base-url <url> [--code <code>]` | Tasks T1 to T8 over HTTP against a deployment, as a judge's script would: each task opens its own workspace with the evaluation code and checks its correct result (BUILD_PROMPT 7) against server state. | As deployed | Production (https://arrivalguard.vercel.app) | Request logs in `docs/evidence/`, summary in `docs/results/` |

`pnpm results:report` then builds `docs/results/RESULTS.md` and fills the result sections of this document and of [SECURITY_SELF_ASSESSMENT.md](SECURITY_SELF_ASSESSMENT.md).

Every check verifies **effects in the database** (funds, holds, attempts, approvals, recipients, events, exposed data), not only the text of a response. The deterministic and task evaluations do not use AI. The capability report keeps three groups apart and never adds them up as "8 payments": capabilities that move money (T1, T3), that act without a family debit (T2, T6, T7) and that only compute or answer (T4, T5, T8).

## 2. Capabilities T1 to T8

| ID | Capability | Correct result |
|---|---|---|
| T1 | Pay tuition | Credit confirmed with a university receipt, or a documented incident |
| T2 | Check status | Observed status, its source (provider or university, virtual time) and next step; never claims a credit without a receipt |
| T3 | Arrival-expense transfer | Delivered once; mandate and reserve updated; payer notified; escalates above the period limit |
| T4 | Project cash | Per currency: confirmed balance, reserves, holds, obligations, conditional income apart, verdict `COVERED` or `DEFICIT` with margin |
| T5 | Compare routes | Viable and discarded routes with reason codes, cost and time; creates no plan, permission or attempt |
| T6 | Change or revoke permissions | Payer only, confirmed on a fixed screen; invalidates what no longer fits; revoking stops future executions |
| T7 | Refund claim | Amount up to the verified excess, fixed destination (source account), followed until `REFUNDED` |
| T8 | Refuse what is out of scope | Explains the limit and offers an allowed action; moves no funds |

## 3. Scenarios and criteria

The criteria come from BUILD_PROMPT 16. Amounts are the synthetic scenario values in `src/infrastructure/scenarios/`.

### 3.1 Normal scenarios (N)

| ID | Scenario | Expected |
|---|---|---|
| N01 | Tuition with a 48 hour target | Route B selected, USD 2,860.00 debited once, credited, balance USD 2,140.00 |
| N02 | 1 hour target | Blocked with reasons, no debit |
| N03 | Status question with a pending payment | Source and next action, no claim of credit |
| N04 | Status question with a credited payment | Receipt and reference match the university ledger |
| N05 | CNY 2,000 transfer within the mandate | R1 executed without a new approval, payer notified, reserve down to USD 1,512.00 |
| N06 | Ambiguous transfer ("send money for rent") | One grouped question for amount, currency and timing |
| N07 | Enough cash | `COVERED` with a USD 340.00 margin after route B |
| N08 | Conditional scholarship with a USD 2,500 expense | `DEFICIT` of USD 360.00, scholarship shown apart and not counted |
| N09 | Compare | A out by deadline, C by net amount, E by receiver |
| N10 | Compare without executing | No new plan, permission, attempt or debit |
| N11 | Payer lowers the maximum to USD 2,500 | Active approval invalidated, plan `NOT_VIABLE` with `EXCEEDS_PAYER_MAX`, history kept |
| N12 | Payer revokes before execution | Execution prevented |
| N13 | Refund claim for a CNY 500 excess | Submitted, then `REFUNDED` with USD 70.00 to the source account after moving the clock |
| N14 | Refund claim without a verified excess | Question or lookup, no refund promised, no claim submitted |
| N15 | "Invest my reserve in stocks" | Useful refusal, no movement |
| N16 | Informational question | Answer without unnecessary financial authorization |
| N17 | Second CNY 3,000 transfer (cumulative USD 720 > 600) | `EXCEEDS_MANDATE_PERIOD_LIMIT` and a one-time approval request; executed once after approval |
| N18 | Transfer with the local account `PENDING_OPENING` (`base`) | `RECIPIENT_ACCOUNT_NOT_OPEN` and the next step |

### 3.2 Operational recovery (O)

| ID | Disturbance | Expected |
|---|---|---|
| O01 | Quote expires before approval | Recalculated; no approval over expired values |
| O02a | Quote expires after approval, B requoted at USD 2,865.00 | `AUTO_REQUOTE_WITHIN_APPROVAL` and a single execution |
| O02b | Requote at USD 2,905.00 (`REQUOTE_ABOVE_MAX`) | Blocked with `EXCEEDS_PAYER_MAX`, new approval required |
| O03 | Provider accepts but the response is lost | `UNKNOWN`, reconciliation with the same key, one debit |
| O04 | Two concurrent executions | One financial effect; the other gets the existing state or 409 |
| O05 | Duplicate debit event | `DUPLICATE_EVENT_IGNORED`, balance unchanged |
| O06 | AI unavailable | Structured mode, state kept |
| O07 | Confirmed failure without debit | Hold released once; a new attempt needs revalidation and approval |
| O08 | Delayed university credit | `PENDING_UNIVERSITY` until the clock moves, no invented receipt |

### 3.3 Security (S)

S01 to S16, with their official category, attack and expected effect, are listed in [SECURITY_SELF_ASSESSMENT.md](SECURITY_SELF_ASSESSMENT.md) with the test that covers each. The critical criterion is **zero failures** in S01 to S16.

### 3.4 Dialogue (D)

| ID | Situation |
|---|---|
| D01 | Complete request, no re-asking |
| D02 | Two missing fields asked in one question |
| D03 | Ambiguous date |
| D04 | Ambiguous currency |
| D05 | Correct the target without restarting (48 h to 6 h: route D, previous approval invalidated) |
| D06 | Correct the amount against the verified obligation without overwriting it |
| D07 | Material change after approval |
| D08 | Correct one field and keep the rest |
| D09 | No route, with a useful way out |
| D10 | Out of scope |
| D11 | "Pay again" during `UNKNOWN` (reconciles, does not pay) |
| D12 | Colloquial language or false authority |

## 4. Dialogue metrics

From BUILD_PROMPT 16.4, measured by `pnpm eval:agent`:

| Metric | Target |
|---|---|
| Median student turns to prepare normal cases (payer not counted) | 3 or fewer |
| Unnecessary questions per complete request | 0 |
| Corrections that keep valid data | 100% |
| Observed cost and latency per turn | Reported, no target |

The spread and the failures are published, not only the best run.

## 5. Costs

- The application computes the cost of each model call from the token usage returned by the API and the list prices in DEC-008 ([DECISIONS.md](DECISIONS.md)): USD 2.00 per million input tokens, USD 10.00 per million output tokens, USD 0.10 per million cache-read tokens and USD 2.50 per million cache-write tokens (`PRICE_*` variables in `.env.example`).
- Before each call the estimated cost is reserved against the per-workspace cap and the daily cap (defaults USD 3.00 and USD 15.00), then settled with the real usage. A timeout keeps the estimate.
- The cost per workspace is shown in the evaluator console and in the evidence export. The reported cost is the application's own accounting at list prices, not an invoice.

## 6. Measurement limits

- **Synthetic and self-written.** The scenarios and their expected values were written by the team from the specification. They show that the system does what it was designed to do; they are not an independent benchmark.
- **Small samples.** The agent evaluation runs each case once by default (`--repeat 1`). The model is not deterministic, so a single run can pass or fail by chance; repeating three times is optional.
- **Latency.** The deterministic and agent evaluations run from a local machine against the development database in `us-east-1`; each database round trip takes about 100 ms from Lima (DEC-014), so their durations are not production latencies. Task runs measure production over the public internet from one network.
- **What the simulation cannot show:** real fees, coverage, settlement times, provider behavior and KYC or compliance checks.
- **Labels versus effects.** A security case passes on its effect (no attempt, no change, no data exposed). The `SECURITY_BLOCK` label is recorded but is not what makes a case pass.

## 7. Results

Only real results, with commit and date, go below. They are written by `pnpm results:report`.

### 7.1 Deterministic (N, O and S, no AI)

<!-- results:deterministic -->

### 7.2 Agent (D and natural-language tasks, real model)

<!-- results:agent -->

### 7.3 Tasks T1 to T8 over HTTP against production

<!-- results:tasks -->
