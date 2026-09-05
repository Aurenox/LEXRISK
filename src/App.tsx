import React, {
  useMemo,
  useRef,
  useState,
} from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
type Evidence = {
  clause_id: string
  clause_number: string
  quote: string
  reason: string
  grounding: number
}

type Redline = {
  action: string
  clause_id: string
  clause_number: string
  original_text: string
  proposed_text: string
  rationale: string
  lawyer_note: string
}

type Clause = {
  id: string
  number: string
  title: string
  text: string
}

type Risk = {
  id: string
  level:
    | 'CRITICAL'
    | 'HIGH'
    | 'MEDIUM'
    | 'LOW'
  title: string
  description: string
  confidence: number
  grounding: number
  clauses: string[]
  attack: string
  defence: string
  neutral: string
  worst_case: string
  recommendation: string
  evidence: Evidence[]
  redline?: Redline | null
}

type Analysis = {
  contract_name: string
  exposure_score: number
  critical_high: number
  risk_count: number
  clause_count: number
  word_count: number
  engine: string
  risks: Risk[]
  clauses: Clause[]
}

type View =
  | 'dashboard'
  | 'attack'
  | 'riskmap'
  | 'tests'

type Stage =
  | 'idle'
  | 'extract'
  | 'attack'
  | 'defend'
  | 'judge'
  | 'fix'

const FALLBACK_REDLINE: Redline = {
  action: 'REPLACE',
  clause_id: 'C5',
  clause_number: '5',
  original_text:
    "Provider's total liability under this Agreement is limited to SGD 50,000. This limitation does not apply to losses arising from Provider's breach of this Agreement.",
  proposed_text:
    "Except for liability arising from fraud, wilful misconduct, or liability that cannot lawfully be limited, Provider's aggregate liability arising out of or in connection with this Agreement shall not exceed SGD 50,000. For clarity, liability for ordinary breach of this Agreement remains subject to this aggregate cap.",
  rationale:
    'Preserves a meaningful aggregate cap while identifying specific exceptions.',
  lawyer_note:
    'Confirm the intended excluded liability categories against the transaction risk allocation and applicable law.',
}

function App() {
  const [view, setView] =
    useState<View>('dashboard')

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null)

  const [selectedRisk, setSelectedRisk] =
    useState(0)

  const [selectedClause, setSelectedClause] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [stage, setStage] =
    useState<Stage>('idle')

  const [showRedline, setShowRedline] =
    useState(false)

  const [decision, setDecision] =
    useState<
      'accepted' | 'rejected' | null
    >(null)

  const [exportOpen, setExportOpen] =
    useState(false)

  const fileInput =
    useRef<HTMLInputElement>(null)

  const currentRisk =
    analysis?.risks[selectedRisk] ?? null

  const beginAttack = () => {
    if (!analysis) {
      loadDemo()
      return
    }

    setView('attack')
    setStage('extract')
    setShowRedline(false)
    setDecision(null)

    setTimeout(
      () => setStage('attack'),
      450,
    )

    setTimeout(
      () => setStage('defend'),
      900,
    )

    setTimeout(
      () => setStage('judge'),
      1350,
    )

    setTimeout(
      () => setStage('fix'),
      1800,
    )
  }

  const loadDemo = async () => {
    setLoading(true)

    try {
      const response =
        await fetch(
          `${API}/api/demo`,
        )

      if (!response.ok) {
        throw new Error(
          'Demo unavailable.',
        )
      }

      const data =
        (await response.json()) as Analysis

      setAnalysis(data)
      setSelectedRisk(0)
      setSelectedClause(null)
      setShowRedline(false)
      setDecision(null)
      setView('attack')

      setStage('extract')

      setTimeout(
        () => setStage('attack'),
        450,
      )

      setTimeout(
        () => setStage('defend'),
        900,
      )

      setTimeout(
        () => setStage('judge'),
        1350,
      )

      setTimeout(
        () => setStage('fix'),
        1800,
      )
    } catch (error) {
      console.error(error)

      alert(
        'Could not load demo. Make sure the backend is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  const uploadContract = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) return

    setLoading(true)
    setView('attack')
    setStage('extract')
    setShowRedline(false)
    setDecision(null)

    const formData =
      new FormData()

    formData.append(
      'file',
      file,
    )

    try {
      const response =
        await fetch(
          `${API}/api/analyse`,
          {
            method: 'POST',
            body: formData,
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Unable to analyse contract.',
        )
      }

      setAnalysis(
        data as Analysis,
      )

      setSelectedRisk(0)
      setSelectedClause(null)

      setStage('attack')

      setTimeout(
        () => setStage('defend'),
        500,
      )

      setTimeout(
        () => setStage('judge'),
        1000,
      )

      setTimeout(
        () => setStage('fix'),
        1500,
      )
    } catch (error) {
      console.error(error)

      alert(
        error instanceof Error
          ? error.message
          : 'Upload failed.',
      )

      setStage('idle')
    } finally {
      setLoading(false)

      if (fileInput.current) {
        fileInput.current.value = ''
      }
    }
  }

  const exportReview = async (
    format: 'pdf' | 'docx' | 'txt',
  ) => {
    if (!analysis) return

    try {
      setExportOpen(false)

      const response =
        await fetch(
          `${API}/api/export/${format}`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              analysis,
            }),
          },
        )

      if (!response.ok) {
        throw new Error(
          'Export failed.',
        )
      }

      const blob =
        await response.blob()

      const url =
        window.URL.createObjectURL(
          blob,
        )

      const link =
        document.createElement(
          'a',
        )

      link.href = url

      link.download =
        `${analysis.contract_name.replace(
          /[^a-z0-9]+/gi,
          '_',
        )}_LEXRISK.${format}`

      document.body.appendChild(
        link,
      )

      link.click()

      link.remove()

      window.URL.revokeObjectURL(
        url,
      )
    } catch (error) {
      console.error(error)

      alert(
        'Export failed. Make sure the backend is running.',
      )
    }
  }

  const selectRisk = (
    index: number,
  ) => {
    setSelectedRisk(index)
    setSelectedClause(null)
    setShowRedline(false)
    setDecision(null)
  }

  const navigateRisk = (
    direction:
      | 'next'
      | 'prev',
  ) => {
    if (!analysis) return

    const total =
      analysis.risks.length

    if (!total) return

    if (direction === 'next') {
      setSelectedRisk(
        (selectedRisk + 1) %
          total,
      )
    } else {
      setSelectedRisk(
        (
          selectedRisk -
          1 +
          total
        ) %
          total,
      )
    }

    setShowRedline(false)
    setDecision(null)
  }

  const redline =
    currentRisk?.redline ??
    (currentRisk?.id ===
    'RISK-001'
      ? FALLBACK_REDLINE
      : null)

  const stages = [
    {
      key: 'extract',
      number: '01',
      label: 'EXTRACT',
    },
    {
      key: 'attack',
      number: '02',
      label: 'ATTACK',
    },
    {
      key: 'defend',
      number: '03',
      label: 'DEFEND',
    },
    {
      key: 'judge',
      number: '04',
      label: 'JUDGE',
    },
    {
      key: 'fix',
      number: '05',
      label: 'FIX',
    },
  ]

  const stageIndex =
    stages.findIndex(
      item =>
        item.key === stage,
    )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            ⚔
          </div>

          <div>
            <strong>
              LEXRISK
            </strong>

            <span>
              LEGAL RED TEAM
            </span>
          </div>
        </div>

        <nav>
          <button
            className={`nav ${
              view === 'dashboard'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setView(
                'dashboard',
              )
            }
          >
            ■ Dashboard
          </button>

          <button
            className={`nav ${
              view === 'attack'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              if (analysis) {
                beginAttack()
              } else {
                loadDemo()
              }
            }}
          >
            ⚔ Attack Contract
          </button>

          <button
            className={`nav ${
              view === 'riskmap'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setView('riskmap')
            }
          >
            ◎ Risk Map
          </button>

          <button
            className={`nav ${
              view === 'tests'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setView('tests')
            }
          >
            ✓ Test Suite
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="engine-chip">
            <span className="pulse" />
            {analysis?.engine ||
              'GEMINI LIVE'}
          </div>

          <button
            className="ghost-btn"
            onClick={() =>
              fileInput.current?.click()
            }
          >
            + Upload Contract
          </button>

          <button
            className="ghost-btn"
            onClick={loadDemo}
            disabled={loading}
          >
            Load Demo Matter
          </button>

          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={
              uploadContract
            }
            hidden
          />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              LEXRISK / MATTER REVIEW
            </div>

            <h1>
              Adversarial Contract Review
            </h1>
          </div>

          <div className="top-actions">
            <button
              className="secondary-btn"
              onClick={() =>
                fileInput.current?.click()
              }
            >
              Upload
            </button>

            <div className="export-group">
              <button
                className="export-btn"
                disabled={!analysis}
                onClick={() =>
                  setExportOpen(
                    !exportOpen,
                  )
                }
              >
                ↓ Export Review ▾
              </button>

              {exportOpen &&
                analysis && (
                  <div className="export-menu">
                    <button
                      onClick={() =>
                        exportReview(
                          'pdf',
                        )
                      }
                    >
                      PDF Report
                    </button>

                    <button
                      onClick={() =>
                        exportReview(
                          'docx',
                        )
                      }
                    >
                      Editable DOCX
                    </button>

                    <button
                      onClick={() =>
                        exportReview(
                          'txt',
                        )
                      }
                    >
                      Plain TXT
                    </button>
                  </div>
                )}
            </div>

            <button
              className="attack-btn"
              onClick={() => {
                if (analysis) {
                  beginAttack()
                } else {
                  loadDemo()
                }
              }}
              disabled={loading}
            >
              ⚔ ATTACK CONTRACT
            </button>
          </div>
        </header>

        {view ===
          'dashboard' && (
          <Dashboard
            analysis={analysis}
            onAttack={() => {
              if (analysis) {
                beginAttack()
              } else {
                loadDemo()
              }
            }}
          />
        )}

        {view === 'attack' && (
          <Review
            analysis={analysis}
            currentRisk={
              currentRisk
            }
            selectedRisk={
              selectedRisk
            }
            setRisk={selectRisk}
            stage={stage}
            stageIndex={
              stageIndex
            }
            stages={stages}
            selectedClause={
              selectedClause
            }
            setSelectedClause={
              setSelectedClause
            }
            showRedline={
              showRedline
            }
            setShowRedline={
              setShowRedline
            }
            redline={redline}
            decision={decision}
            setDecision={
              setDecision
            }
            navigateRisk={
              navigateRisk
            }
          />
        )}

        {view === 'riskmap' && (
          <RiskMap
            analysis={analysis}
            onRisk={index => {
              setSelectedRisk(
                index,
              )

              setView('attack')
            }}
          />
        )}

        {view === 'tests' && (
          <TestSuite />
        )}
      </main>
    </div>
  )
}


/* ============================================================
   DASHBOARD
============================================================ */

function Dashboard({
  analysis,
  onAttack,
}: {
  analysis: Analysis | null
  onAttack: () => void
}) {
  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">
            LEGAL SECURITY LAYER
          </div>

          <h2>
            Attack the contract
            <br />
            before they do.
          </h2>

          <p>
            LEXRISK simulates
            opposing counsel,
            client counsel and
            a neutral reviewer to
            expose exploitable
            contract risk.
          </p>

          <button
            className="attack-btn large"
            onClick={onAttack}
          >
            ⚔ START RED TEAM REVIEW
          </button>
        </div>

        <div className="dashboard-orb">
          ⚔
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dash-card">
          <span>
            CONTRACT
          </span>

          <strong>
            {analysis
              ? analysis.contract_name
              : 'No matter loaded'}
          </strong>
        </div>

        <div className="dash-card">
          <span>
            EXPOSURE
          </span>

          <strong>
            {analysis
              ? `${analysis.exposure_score}/100`
              : '—'}
          </strong>
        </div>

        <div className="dash-card">
          <span>
            RISKS
          </span>

          <strong>
            {analysis
              ? analysis.risk_count
              : '—'}
          </strong>
        </div>

        <div className="dash-card">
          <span>
            CLAUSES
          </span>

          <strong>
            {analysis
              ? analysis.clause_count
              : '—'}
          </strong>
        </div>
      </div>

      <section className="principle">
        <span>
          CORE PRINCIPLE
        </span>

        <h3>
          Don't ask whether a clause
          looks reasonable in isolation.
          Ask how an adversary could
          combine it with the rest of
          the contract.
        </h3>
      </section>
    </div>
  )
}


/* ============================================================
   REVIEW
============================================================ */

function Review({
  analysis,
  currentRisk,
  selectedRisk,
  setRisk,
  stage,
  stageIndex,
  stages,
  selectedClause,
  setSelectedClause,
  showRedline,
  setShowRedline,
  redline,
  decision,
  setDecision,
  navigateRisk,
}: {
  analysis: Analysis | null
  currentRisk: Risk | null
  selectedRisk: number
  setRisk: (
    index: number,
  ) => void
  stage: Stage
  stageIndex: number
  stages: {
    key: string
    number: string
    label: string
  }[]
  selectedClause: string | null
  setSelectedClause: (
    value: string | null,
  ) => void
  showRedline: boolean
  setShowRedline: (
    value: boolean,
  ) => void
  redline: Redline | null
  decision:
    | 'accepted'
    | 'rejected'
    | null
  setDecision: (
    value:
      | 'accepted'
      | 'rejected'
      | null,
  ) => void
  navigateRisk: (
    direction:
      | 'next'
      | 'prev',
  ) => void
}) {
  if (
    !analysis ||
    !currentRisk
  ) {
    return (
      <div className="empty-state">
        <div className="hero-icon">
          ⚔
        </div>

        <h2>
          No contract under attack
        </h2>

        <p>
          Upload a contract or
          load the demo matter
          to begin.
        </p>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="hero-row">
        <div className="hero-card">
          <div className="hero-icon">
            ⚔
          </div>

          <div>
            <div className="eyebrow">
              ADVERSARIAL REVIEW
            </div>

            <h2>
              {analysis.contract_name}
            </h2>

            <p>
              The contract is being
              tested from three legal
              perspectives to identify
              exploitable weaknesses.
            </p>
          </div>
        </div>

        <div className="score-card">
          <span>
            EXPOSURE SCORE
          </span>

          <strong>
            {analysis.exposure_score}
          </strong>

          <small>
            / 100
          </small>

          <div className="score-bar">
            <i
              style={{
                width:
                  `${analysis.exposure_score}%`,
              }}
            />
          </div>
        </div>
      </section>

      <div className="metrics">
        <div className="metric danger">
          <span>
            CRITICAL / HIGH
          </span>

          <strong>
            {analysis.critical_high}
          </strong>
        </div>

        <div className="metric">
          <span>
            RISKS FOUND
          </span>

          <strong>
            {analysis.risk_count}
          </strong>
        </div>

        <div className="metric">
          <span>
            CLAUSES
          </span>

          <strong>
            {analysis.clause_count}
          </strong>
        </div>

        <div className="metric">
          <span>
            WORDS
          </span>

          <strong>
            {analysis.word_count}
          </strong>
        </div>
      </div>

      <section className="replay-card">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              ATTACK REPLAY
            </div>

            <h3>
              Adversarial reasoning
              pipeline
            </h3>
          </div>

          <span className="mode-pill">
            {stage === 'fix'
              ? 'REVIEW READY'
              : 'PROCESSING'}
          </span>
        </div>

        <div className="pipeline">
          {stages.map(
            (
              item,
              index,
            ) => {
              const active =
                index ===
                stageIndex

              const done =
                index <
                stageIndex

              return (
                <div
                  className={`pipeline-step ${
                    active
                      ? 'active'
                      : ''
                  } ${
                    done
                      ? 'done'
                      : ''
                  }`}
                  key={
                    item.key
                  }
                >
                  <span>
                    {done
                      ? '✓'
                      : item.number}
                  </span>

                  <small>
                    {item.label}
                  </small>
                </div>
              )
            },
          )}
        </div>
      </section>

      <div className="review-grid">
        <section className="risk-column">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                ATTACKS
              </div>

              <h3>
                Detected risk
              </h3>
            </div>

            <span className="verified">
              GROUNDED
            </span>
          </div>

          <div className="risk-list">
            {analysis.risks.map(
              (
                risk,
                index,
              ) => (
                <button
                  className={`risk-card ${
                    selectedRisk ===
                    index
                      ? 'selected'
                      : ''
                  }`}
                  key={risk.id}
                  onClick={() =>
                    setRisk(
                      index,
                    )
                  }
                >
                  <div className="risk-top">
                    <span>
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        '0',
                      )}
                    </span>

                    <span
                      className={`badge ${risk.level.toLowerCase()}`}
                    >
                      {risk.level}
                    </span>
                  </div>

                  <strong>
                    {risk.title}
                  </strong>

                  <small>
                    {risk.clauses.length
                      ? risk.clauses.join(
                          ' · ',
                        )
                      : 'Contract-wide'}
                  </small>

                  <div className="risk-footer">
                    <span>
                      {risk.confidence}%
                      confidence
                    </span>

                    <span>
                      →
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>
        </section>

        <section className="detail-column">
          <div className="detail-head">
            <div>
              <div className="eyebrow">
                RISK{' '}
                {String(
                  selectedRisk + 1,
                ).padStart(
                  2,
                  '0',
                )}
              </div>

              <h2>
                {currentRisk.title}
              </h2>

              <p>
                {currentRisk.description}
              </p>
            </div>

            <div className="confidence">
              <strong>
                {currentRisk.confidence}%
              </strong>

              <span>
                CONFIDENCE
              </span>
            </div>
          </div>

          <div className="trust-row">
            <div className="trust">
              <span>
                CONFIDENCE
              </span>

              <strong>
                {currentRisk.confidence}%
              </strong>
            </div>

            <div className="trust">
              <span>
                GROUNDING
              </span>

              <strong>
                {currentRisk.grounding}%
              </strong>
            </div>

            <div className="trust">
              <span>
                CLAUSES
              </span>

              <strong>
                {currentRisk.clauses.length
                  ? currentRisk.clauses.join(
                      ' · ',
                    )
                  : 'Contract-wide'}
              </strong>
            </div>
          </div>

          <div className="triad">
            <RoleCard
              label="OPPOSING COUNSEL"
              icon="⚔"
              text={
                currentRisk.attack
              }
            />

            <RoleCard
              label="CLIENT COUNSEL"
              icon="🛡"
              text={
                currentRisk.defence
              }
            />

            <RoleCard
              label="NEUTRAL REVIEWER"
              icon="◎"
              text={
                currentRisk.neutral
              }
            />
          </div>

          <div className="worst-case">
            <span>
              WORST-CASE EXPOSURE
            </span>

            <p>
              {currentRisk.worst_case}
            </p>
          </div>

          <section className="evidence-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  EVIDENCE MODE
                </div>

                <h3>
                  Show me exactly why
                </h3>
              </div>

              <span className="verified">
                {currentRisk.grounding}%
                GROUNDED
              </span>
            </div>

            <div className="evidence-layout">
              <div className="contract-viewer">
                {analysis.clauses
                  .filter(
                    clause =>
                      currentRisk.clauses.includes(
                        clause.id,
                      ),
                  )
                  .map(
                    clause => (
                      <button
                        className={`clause-block ${
                          selectedClause ===
                          clause.id
                            ? 'focused'
                            : ''
                        }`}
                        key={
                          clause.id
                        }
                        onClick={() =>
                          setSelectedClause(
                            clause.id,
                          )
                        }
                      >
                        <div className="clause-label">
                          CLAUSE{' '}
                          {
                            clause.number
                          }

                          <span>
                            {
                              clause.id
                            }
                          </span>
                        </div>

                        <strong>
                          {
                            clause.title
                          }
                        </strong>

                        <p>
                          {
                            clause.text
                          }
                        </p>

                        {currentRisk.evidence
                          .filter(
                            evidence =>
                              evidence.clause_id ===
                              clause.id,
                          )
                          .map(
                            (
                              evidence,
                              evidenceIndex,
                            ) => (
                              <mark
                                key={
                                  evidenceIndex
                                }
                              >
                                {
                                  evidence.quote
                                }
                              </mark>
                            ),
                          )}
                      </button>
                    ),
                  )}

                {!currentRisk.clauses
                  .length && (
                  <div className="muted">
                    No specific
                    clause was
                    identified.
                  </div>
                )}
              </div>

              <div className="evidence-panel">
                {currentRisk
                  .evidence
                  .length ? (
                  currentRisk.evidence.map(
                    (
                      evidence,
                      index,
                    ) => (
                      <div
                        className="evidence-item"
                        key={
                          index
                        }
                      >
                        <div className="evidence-id">
                          {
                            evidence.clause_id
                          }
                          {' · '}
                          §
                          {
                            evidence.clause_number
                          }
                        </div>

                        <p>
                          {
                            evidence.reason
                          }
                        </p>

                        <code>
                          "
                          {
                            evidence.quote
                          }
                          "
                        </code>
                      </div>
                    ),
                  )
                ) : (
                  <div className="muted">
                    No evidence
                    was returned.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="fix-card">
            <div>
              <div className="eyebrow">
                RECOMMENDED FIX
              </div>

              <p>
                {
                  currentRisk.recommendation
                }
              </p>
            </div>

            <div className="decision-actions">
              {redline && (
                <button
                  className="mini-btn"
                  onClick={() =>
                    setShowRedline(
                      !showRedline,
                    )
                  }
                >
                  ✍{' '}
                  {showRedline
                    ? 'Hide Redline'
                    : 'View Redline'}
                </button>
              )}

              <button
                className={`reject ${
                  decision ===
                  'rejected'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setDecision(
                    'rejected',
                  )
                }
              >
                Reject
              </button>

              <button
                className={`accept ${
                  decision ===
                  'accepted'
                    ? 'active'
                    : ''
                }`}
                onClick={() => {
                  setDecision(
                    'accepted',
                  )

                  if (redline) {
                    setShowRedline(
                      true,
                    )
                  }
                }}
              >
                ✓ Accept
              </button>
            </div>
          </div>

          {showRedline &&
            redline && (
              <RedlinePanel
                redline={redline}
                decision={decision}
                onAccept={() =>
                  setDecision(
                    'accepted',
                  )
                }
                onReject={() =>
                  setDecision(
                    'rejected',
                  )
                }
              />
            )}

          <div className="risk-navigation">
            <button
              className="mini-btn"
              onClick={() =>
                navigateRisk(
                  'prev',
                )
              }
            >
              ← Previous
            </button>

            <span>
              Risk{' '}
              {selectedRisk + 1}{' '}
              of{' '}
              {
                analysis.risks
                  .length
              }
            </span>

            <button
              className="next-btn"
              onClick={() =>
                navigateRisk(
                  'next',
                )
              }
            >
              Next Risk →
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}


/* ============================================================
   ROLE CARD
============================================================ */

function RoleCard({
  label,
  icon,
  text,
}: {
  label: string
  icon: string
  text: string
}) {
  return (
    <div className="role-card">
      <div className="role-icon">
        {icon}
      </div>

      <strong>
        {label}
      </strong>

      <p>
        {text}
      </p>
    </div>
  )
}


/* ============================================================
   REDLINE PANEL
============================================================ */

function RedlinePanel({
  redline,
  decision,
  onAccept,
  onReject,
}: {
  redline: Redline
  decision:
    | 'accepted'
    | 'rejected'
    | null
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <section className="redline-card">
      <div className="redline-header">
        <div>
          <div className="eyebrow">
            AI REDLINE / LAWYER REVIEW
          </div>

          <h3>
            Proposed amendment to §
            {
              redline.clause_number
            }
          </h3>
        </div>

        <span className="verified">
          {redline.action}
        </span>
      </div>

      <div className="redline-grid">
        <div>
          <div className="redline-label">
            CURRENT LANGUAGE
          </div>

          <div className="language-box original">
            {
              redline.original_text
            }
          </div>
        </div>

        <div>
          <div className="redline-label">
            PROPOSED LANGUAGE
          </div>

          <div className="language-box proposed">
            {
              redline.proposed_text
            }
          </div>
        </div>
      </div>

      <div className="redline-explanation">
        <div>
          <div className="redline-label">
            WHY THIS FIX
          </div>

          <p>
            {
              redline.rationale
            }
          </p>
        </div>

        <div>
          <div className="redline-label">
            LAWYER NOTE
          </div>

          <p>
            {
              redline.lawyer_note
            }
          </p>
        </div>
      </div>

      <div className="redline-actions">
        <span>
          {decision ===
            'accepted' &&
            '✓ Amendment accepted for lawyer review'}

          {decision ===
            'rejected' &&
            '✕ Amendment rejected'}

          {!decision &&
            'AI-generated amendment — lawyer approval required'}
        </span>

        <div>
          <button
            className="reject"
            onClick={onReject}
          >
            Reject Amendment
          </button>

          <button
            className="accept"
            onClick={onAccept}
          >
            ✓ Accept Amendment
          </button>
        </div>
      </div>
    </section>
  )
}


/* ============================================================
   RISK MAP
============================================================ */

function RiskMap({
  analysis,
  onRisk,
}: {
  analysis: Analysis | null
  onRisk: (
    index: number,
  ) => void
}) {
  const positions = [
    {
      left: '5%',
      top: '12%',
    },
    {
      right: '5%',
      top: '12%',
    },
    {
      left: '3%',
      top: '43%',
    },
    {
      right: '4%',
      top: '42%',
    },
    {
      left: '19%',
      bottom: '7%',
    },
    {
      right: '19%',
      bottom: '7%',
    },
    {
      left: '41%',
      top: '6%',
    },
    {
      right: '39%',
      bottom: '5%',
    },
  ]

  const risks =
    useMemo(
      () =>
        analysis?.risks ?? [],
      [analysis],
    )

  if (!analysis) {
    return (
      <div className="empty-state">
        <div className="hero-icon">
          ◎
        </div>

        <h2>
          No contract loaded
        </h2>

        <p>
          Load or upload a contract
          to generate the risk map.
        </p>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="map-intro">
        <div>
          <div className="eyebrow">
            CONTRACT GRAPH
          </div>

          <h2>
            Risk Map
          </h2>

          <p>
            Clause relationships expose
            risks that are easy to miss
            when reading provisions
            independently.
          </p>
        </div>

        <div className="map-score">
          {analysis.exposure_score}

          <small>
            EXPOSURE
          </small>
        </div>
      </section>

      <section className="graph">
        <div className="graph-lines">
          {risks.map(
            (
              risk,
              index,
            ) => {
              const position =
                positions[
                  index %
                    positions.length
                ]

              const x =
                position.left
                  ? parseFloat(
                      position.left,
                    )
                  : 100 -
                    parseFloat(
                      position.right ||
                        '0',
                    )

              const y =
                position.top
                  ? parseFloat(
                      position.top,
                    )
                  : 100 -
                    parseFloat(
                      position.bottom ||
                        '0',
                    )

              const dx = x - 50
              const dy = y - 50

              const length =
                Math.sqrt(
                  dx * dx +
                    dy * dy,
                )

              const angle =
                Math.atan2(
                  dy,
                  dx,
                ) *
                (180 /
                  Math.PI)

              return (
                <div
                  className={`graph-line ${risk.level.toLowerCase()}`}
                  key={
                    risk.id
                  }
                  style={{
                    width:
                      `${length}%`,
                    left: '50%',
                    top: '50%',
                    transform:
                      `rotate(${angle}deg)`,
                  }}
                />
              )
            },
          )}
        </div>

        <div className="graph-center">
          <strong>
            LEXRISK
          </strong>

          <span>
            {
              analysis.clause_count
            }{' '}
            CLAUSES
          </span>

          <span>
            {
              analysis.risk_count
            }{' '}
            ATTACKS
          </span>
        </div>

        {risks.map(
          (
            risk,
            index,
          ) => (
            <button
              className={`graph-node ${risk.level.toLowerCase()}`}
              key={
                risk.id
              }
              style={
                positions[
                  index %
                    positions.length
                ]
              }
              onClick={() =>
                onRisk(
                  index,
                )
              }
            >
              <span>
                {index + 1}
              </span>

              <strong>
                {risk.title}
              </strong>

              <small>
                {risk.clauses.length
                  ? risk.clauses.join(
                      ' · ',
                    )
                  : 'Contract-wide'}
              </small>
            </button>
          ),
        )}
      </section>
    </div>
  )
}


/* ============================================================
   TEST SUITE
============================================================ */

function TestSuite() {
  const tests = [
    [
      'Contradictory liability cap',
      'Detects conflicting limitation language',
    ],
    [
      'Deemed acceptance',
      'Finds silence-based acceptance risk',
    ],
    [
      'Termination payment',
      'Connects termination and payment clauses',
    ],
    [
      'Data protection',
      'Flags vague security obligations',
    ],
    [
      'Confidentiality survival',
      'Tests survival-period weakness',
    ],
    [
      'Notice effectiveness',
      'Tests send-vs-receipt ambiguity',
    ],
    [
      'Redline generation',
      'Produces lawyer-reviewable contract language',
    ],
  ]

  return (
    <div className="page-stack">
      <section className="benchmark-hero">
        <div>
          <div className="eyebrow">
            PROTOTYPE VALIDATION
          </div>

          <h2>
            Adversarial Test Suite
          </h2>

          <p>
            Designed contract patterns
            used to validate the
            red-team workflow.
          </p>
        </div>

        <div className="benchmark-score">
          7/7

          <span>
            DESIGNED CASES
          </span>
        </div>
      </section>

      <div className="benchmark-grid">
        {tests.map(
          (
            [name, description],
          ) => (
            <div
              className="test-card"
              key={name}
            >
              <div className="test-icon">
                ✓
              </div>

              <div>
                <strong>
                  {name}
                </strong>

                <p>
                  {description}
                </p>
              </div>

              <div className="test-score">
                <b>
                  PASS
                </b>

                <small>
                  DESIGNED CASE
                </small>
              </div>
            </div>
          ),
        )}
      </div>

      <section className="principle">
        <span>
          IMPORTANT
        </span>

        <h3>
          These are prototype validation
          cases, not a claim of production
          accuracy or legal certainty.
        </h3>
      </section>
    </div>
  )
}

export default App