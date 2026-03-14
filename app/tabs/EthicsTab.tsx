'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TbRefresh, TbFlask, TbArrowLeft, TbPlayerPlay, TbList, TbHistory } from 'react-icons/tb';
import { apiGet, apiPost, ApiError } from '../lib/api';
import TabMenu from '../components/TabMenu';
import type {
  ScenarioItem, ScenariosResponse, ScenarioDetail,
  ScenarioRelatedNews, PrecedentInsights,
  RunItem, RunsResponse, RunDetail,
  RunTriggerResponse, RunStatusResponse,
} from '../lib/types';

// ---------------------------------------------------------------------------
// Sub-view types
// ---------------------------------------------------------------------------
type MenuView = 'scenarios' | 'runs';
type View =
  | { screen: 'list' }
  | { screen: 'detail'; slug: string }
  | { screen: 'running'; uid: string; scenarioName: string }
  | { screen: 'result'; uid: string };

const MENU_SECTIONS = [
  {
    items: [
      { id: 'scenarios' as const, label: 'Scenarios', Icon: TbFlask },
      { id: 'runs' as const, label: 'All Runs', Icon: TbHistory },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function EthicsTab() {
  const [menuView, setMenuView] = useState<MenuView>('scenarios');
  const [view, setView] = useState<View>({ screen: 'list' });

  // When switching menu, reset to list
  const selectMenu = (id: string) => {
    setMenuView(id as MenuView);
    setView({ screen: 'list' });
  };

  // Deep view (detail/running/result) — hide the menu
  const isDeep = view.screen !== 'list';

  return (
    <div className="tab-content">
      {!isDeep && (
        <div className="tab-header">
          <h1 className="tab-header__title">Ethics</h1>
          <div className="tab-header__right">
            <TabMenu sections={MENU_SECTIONS} activeId={menuView} onSelect={selectMenu} />
          </div>
        </div>
      )}

      {menuView === 'scenarios' && (
        <>
          {view.screen === 'list' && (
            <ScenarioListView onSelect={(slug) => setView({ screen: 'detail', slug })} />
          )}
          {view.screen === 'detail' && (
            <ScenarioDetailView
              slug={view.slug}
              onBack={() => setView({ screen: 'list' })}
              onRunStarted={(uid, name) => setView({ screen: 'running', uid, scenarioName: name })}
              onRunSelect={(uid) => setView({ screen: 'result', uid })}
            />
          )}
          {view.screen === 'running' && (
            <RunProgressView
              uid={view.uid}
              scenarioName={view.scenarioName}
              onDone={(resultUid) => setView({ screen: 'result', uid: resultUid })}
              onBack={() => setView({ screen: 'list' })}
            />
          )}
          {view.screen === 'result' && (
            <RunResultView
              uid={view.uid}
              onBack={() => setView({ screen: 'list' })}
            />
          )}
        </>
      )}

      {menuView === 'runs' && (
        <>
          {view.screen === 'list' && (
            <RunsListView onSelect={(uid) => setView({ screen: 'result', uid })} />
          )}
          {view.screen === 'result' && (
            <RunResultView
              uid={view.uid}
              onBack={() => setView({ screen: 'list' })}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario list
// ---------------------------------------------------------------------------
function ScenarioListView({ onSelect }: { onSelect: (slug: string) => void }) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ScenariosResponse>('/api/scenarios/');
      setScenarios(data.scenarios);
    } catch { /* redirect handled by apiGet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <>
      {loading && scenarios.length === 0 ? (
        <div className="skeleton-list">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : (
        <div className="tab-list">
          {scenarios.map((s) => (
            <button key={s.slug} className="scenario-card" onClick={() => onSelect(s.slug)}>
              <span className="scenario-card__title">{s.title}</span>
              <span className="scenario-card__structures">
                {s.label_a || s.structure_a} vs {s.label_b || s.structure_b}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Scenario detail — shows prompt, structures, run button, previous runs
// ---------------------------------------------------------------------------
function ScenarioDetailView({
  slug, onBack, onRunStarted, onRunSelect,
}: {
  slug: string;
  onBack: () => void;
  onRunStarted: (uid: string, scenarioName: string) => void;
  onRunSelect: (uid: string) => void;
}) {
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [modelSet, setModelSet] = useState('budget');
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    apiGet<ScenarioDetail>(`/api/scenarios/${slug}/`).then(setScenario).catch(() => {});
    apiGet<RunsResponse>('/api/runs/').then((data) => {
      setRuns(data.runs.filter(r => r.scenario_slug === slug));
    }).catch(() => {});
  }, [slug]);

  const triggerRun = async () => {
    if (!scenario) return;
    setTriggering(true);
    try {
      const res = await apiPost<RunTriggerResponse>(`/api/scenarios/${slug}/run/`, { model_set: modelSet });
      onRunStarted(res.uid, scenario.title);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to start run');
    } finally {
      setTriggering(false);
    }
  };

  if (!scenario) {
    return <div className="skeleton-list"><div className="skeleton-card" /></div>;
  }

  return (
    <>
      <div className="tab-header">
        <button className="tab-header__action" onClick={onBack} aria-label="Back">
          <TbArrowLeft size={20} />
        </button>
        <h1 className="tab-header__title scenario-detail__title">{scenario.title}</h1>
      </div>

      {/* Structures */}
      <div className="scenario-detail__structures">
        <span className="scenario-detail__tag scenario-detail__tag--a">
          {scenario.label_a || scenario.structure_a}
        </span>
        <span className="scenario-detail__vs">vs</span>
        <span className="scenario-detail__tag scenario-detail__tag--b">
          {scenario.label_b || scenario.structure_b}
        </span>
      </div>

      {/* Prompt */}
      <p className="scenario-detail__prompt">{scenario.prompt_text}</p>

      {/* Run controls (staff) */}
      {scenario.model_sets && (
        <div className="scenario-detail__run">
          <select
            className="scenario-detail__select"
            value={modelSet}
            onChange={(e) => setModelSet(e.target.value)}
          >
            {scenario.model_sets.map((ms) => (
              <option key={ms} value={ms}>{ms}</option>
            ))}
          </select>
          <button
            className="scenario-detail__run-btn"
            onClick={triggerRun}
            disabled={triggering}
          >
            <TbPlayerPlay size={18} />
            {triggering ? 'Starting…' : 'Run Trial'}
          </button>
        </div>
      )}

      {/* Market Intelligence — aggregated precedent insights */}
      {scenario.precedent_insights && (
        <PrecedentInsightsPanel insights={scenario.precedent_insights} />
      )}

      {/* Related News with precedent summaries */}
      {scenario.related_news && scenario.related_news.length > 0 && (
        <div className="scenario-detail__related">
          <h2 className="scenario-detail__runs-title">Related News</h2>
          {scenario.related_news.map((item, i) => (
            <RelatedNewsCard key={i} item={item} />
          ))}
        </div>
      )}

      {/* Previous runs */}
      {runs.length > 0 && (
        <div className="scenario-detail__runs">
          <h2 className="scenario-detail__runs-title">Previous Runs</h2>
          {runs.map((r) => (
            <button key={r.uid} className="run-card" onClick={() => onRunSelect(r.uid)}>
              <span className="run-card__uid">{r.uid}</span>
              <span className="run-card__meta">
                {new Date(r.created_at).toLocaleDateString()} · {Math.round(r.total_elapsed)}s
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Precedent Insights Panel — aggregated market intelligence for a scenario
// ---------------------------------------------------------------------------
function PrecedentInsightsPanel({ insights }: { insights: PrecedentInsights }) {
  return (
    <div className="insights-panel">
      <h2 className="scenario-detail__runs-title">Market Intelligence</h2>
      <p className="insights-panel__desc">
        Historical precedents from headlines matched to this scenario.
      </p>

      {/* Stats row */}
      <div className="insights-panel__stats">
        <div className="insights-panel__stat">
          <span className="insights-panel__num">{insights.total_news}</span>
          <span className="insights-panel__label">Headlines</span>
        </div>
        <div className="insights-panel__stat">
          <span className="insights-panel__num">{insights.total_precedents}</span>
          <span className="insights-panel__label">Precedents</span>
        </div>
        {insights.consensus && (
          <div className="insights-panel__stat">
            <span className={`insights-panel__consensus insights-panel__consensus--${insights.consensus.direction}`}>
              {insights.consensus.direction === 'up' ? '\u2191' : '\u2193'} {insights.consensus.avg_pct}%
            </span>
            <span className="insights-panel__label">
              Avg 5d ({insights.consensus.agreement}% agree)
            </span>
          </div>
        )}
      </div>

      {/* Event type pills */}
      {insights.event_types && insights.event_types.length > 0 && (
        <div className="insights-panel__events">
          {insights.event_types.map((et) => (
            <span key={et.type} className="insights-panel__pill">
              {et.label} <strong>{et.count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Ticker tags */}
      {insights.tickers && insights.tickers.length > 0 && (
        <div className="insights-panel__tickers">
          {insights.tickers.map((t) => (
            <span
              key={t.ticker}
              className={`insights-panel__ticker insights-panel__ticker--${t.direction}`}
            >
              {t.ticker} {t.avg_pct > 0 ? '+' : ''}{t.avg_pct}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Related News Card — single headline with precedent mini-summary
// ---------------------------------------------------------------------------
function RelatedNewsCard({ item }: { item: ScenarioRelatedNews }) {
  return (
    <div className="related-card">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="related-card__title">
        {item.title}
      </a>
      <div className="related-card__meta">
        <span>{item.source}</span>
        {item.scenario_score && (
          <span className="related-card__score">{item.scenario_score}/10</span>
        )}
        {item.analyzed_at && (
          <span>{new Date(item.analyzed_at).toLocaleDateString()}</span>
        )}
      </div>
      {item.scenario_reason && (
        <p className="related-card__reason">{item.scenario_reason}</p>
      )}
      {item.precedent_count > 0 && (
        <div className="related-card__prec">
          <span>{item.precedent_count} precedent{item.precedent_count !== 1 ? 's' : ''}</span>
          {item.avg_quality_pct > 0 && <span>{item.avg_quality_pct}% quality</span>}
          {item.dominant_direction && (
            <span className={`related-card__dir related-card__dir--${item.dominant_direction}`}>
              {item.dominant_direction === 'up' ? '\u2191 up' : '\u2193 down'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run progress — polls /api/runs/<uid>/status/ every 3s
// ---------------------------------------------------------------------------
function RunProgressView({
  uid, scenarioName, onDone, onBack,
}: {
  uid: string;
  scenarioName: string;
  onDone: (resultUid: string) => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState('starting');
  const [log, setLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await apiGet<RunStatusResponse>(`/api/runs/${uid}/status/`);
        setStatus(data.status);
        setLog(data.log);
        if (data.status === 'done' && data.result_uid) {
          if (timerRef.current) clearInterval(timerRef.current);
          onDone(data.result_uid);
        } else if (data.status.startsWith('error')) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch { /* keep polling */ }
    };

    poll();
    timerRef.current = setInterval(poll, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [uid, onDone]);

  return (
    <>
      <div className="tab-header">
        <button className="tab-header__action" onClick={onBack} aria-label="Back">
          <TbArrowLeft size={20} />
        </button>
        <h1 className="tab-header__title">Running…</h1>
      </div>

      <p className="run-progress__scenario">{scenarioName}</p>

      <div className="run-progress__status">
        <TbFlask size={18} className="run-progress__icon" />
        <span>{status}</span>
      </div>

      <div className="run-progress__log">
        {log.map((line, i) => (
          <div key={i} className="run-progress__line">{line}</div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Run result — shows article, titles, excerpts, responses
// ---------------------------------------------------------------------------
function RunResultView({ uid, onBack }: { uid: string; onBack: () => void }) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<RunDetail>(`/api/runs/${uid}/`).then(setRun).catch((err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to load run');
    });
  }, [uid]);

  if (error) {
    return (
      <>
        <div className="tab-header">
          <button className="tab-header__action" onClick={onBack} aria-label="Back">
            <TbArrowLeft size={20} />
          </button>
          <h1 className="tab-header__title">Error</h1>
        </div>
        <p className="run-result__error">{error}</p>
      </>
    );
  }

  if (!run) {
    return <div className="skeleton-list"><div className="skeleton-card" /><div className="skeleton-card" /></div>;
  }

  return (
    <>
      <div className="tab-header">
        <button className="tab-header__action" onClick={onBack} aria-label="Back">
          <TbArrowLeft size={20} />
        </button>
        <h1 className="tab-header__title">{run.scenario_name}</h1>
      </div>

      <div className="run-result__meta">
        <span>{run.uid}</span>
        <span>{new Date(run.created_at).toLocaleDateString()}</span>
        <span>{Math.round(run.total_elapsed)}s</span>
      </div>

      {/* Article */}
      {run.titles.length > 0 && (
        <h2 className="run-result__article-title">{run.titles[0]}</h2>
      )}
      {run.excerpts.length > 0 && (
        <p className="run-result__excerpt">{run.excerpts[0]}</p>
      )}
      {run.article && (
        <div className="run-result__article">{run.article}</div>
      )}

      {/* Responses */}
      {run.responses.length > 0 && (
        <div className="run-result__responses">
          <h2 className="run-result__section-title">Responses ({run.responses.length})</h2>
          {run.responses.map((resp, i) => (
            <div key={i} className="response-card">
              <div className="response-card__header">
                <span className="response-card__actor">{resp.actor || resp.model || `Response ${i + 1}`}</span>
                <span className={`response-card__choice response-card__choice--${resp.chosen_structure}`}>
                  {resp.chosen_structure}
                </span>
              </div>
              <p className="response-card__reasoning">{resp.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// All Runs list — shows all runs across all scenarios
// ---------------------------------------------------------------------------
function RunsListView({ onSelect }: { onSelect: (uid: string) => void }) {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<RunsResponse>('/api/runs/')
      .then(data => setRuns(data.runs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>
    );
  }

  if (runs.length === 0) {
    return <div className="tab-empty"><p>No runs yet.</p></div>;
  }

  return (
    <div className="tab-list">
      {runs.map(r => (
        <button key={r.uid} className="run-card" onClick={() => onSelect(r.uid)}>
          <div className="run-card__top">
            <span className="run-card__name">{r.scenario_name}</span>
            <span className="run-card__date">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <div className="run-card__bottom">
            <span className="run-card__uid">{r.uid}</span>
            <span className="run-card__elapsed">{Math.round(r.total_elapsed)}s</span>
          </div>
        </button>
      ))}
    </div>
  );
}
