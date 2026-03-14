'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbScale, TbUser, TbSparkles } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import type { EthicalScanFull } from '../lib/types';

interface Props {
  symbol: string;
}

/** Displays the latest ethical scan for a stock: scenario, actor verdicts, tension gauge. */
export default function EthicalScanPanel({ symbol }: Props) {
  const [scan, setScan] = useState<EthicalScanFull | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScan = useCallback(async () => {
    try {
      const data = await apiGet<{ scan: EthicalScanFull | null }>(`/api/stock/${symbol}/ethics/`);
      setScan(data.scan);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { fetchScan(); }, [fetchScan]);

  if (loading) return <div className="ethics-panel ethics-panel--loading" />;
  if (!scan) return null;

  const tensionPct = Math.round(scan.tension_score * 100);
  const tensionLabel = scan.tension_score >= 0.35 ? 'High' : scan.tension_score >= 0.15 ? 'Medium' : 'Low';

  return (
    <section className="ethics-panel">
      <h3 className="ethics-panel__title">
        <TbScale size={18} />
        Ethical Scan
      </h3>

      {/* Scenario */}
      <div className="ethics-panel__scenario">
        <div className="ethics-panel__scenario-title">{scan.scenario_title}</div>
        <p className="ethics-panel__scenario-prompt">{scan.scenario_prompt}</p>
      </div>

      {/* Structures in tension */}
      <div className="ethics-panel__structures">
        <span className="ethics-panel__structure">{scan.structure_a}</span>
        <span className="ethics-panel__vs">vs</span>
        <span className="ethics-panel__structure">{scan.structure_b}</span>
      </div>

      {/* Tension gauge */}
      <div className="ethics-panel__tension">
        <div className="ethics-panel__tension-bar">
          <div
            className="ethics-panel__tension-fill"
            style={{ width: `${tensionPct * 2}%` }}
          />
        </div>
        <span className="ethics-panel__tension-label">
          Tension: {tensionLabel} ({tensionPct}%)
        </span>
      </div>

      {/* Actor verdicts */}
      <div className="ethics-panel__actors">
        {scan.actor_results.map((r, i) => (
          <div key={i} className="ethics-panel__actor">
            <div className="ethics-panel__actor-header">
              {r.ad_hoc ? <TbSparkles size={14} /> : <TbUser size={14} />}
              <span className="ethics-panel__actor-name">{r.actor_name}</span>
              <span className={`ethics-panel__actor-choice${
                r.chosen_structure === scan.structure_a ? ' ethics-panel__actor-choice--a' : ' ethics-panel__actor-choice--b'
              }`}>
                {r.chosen_structure}
              </span>
            </div>
            <p className="ethics-panel__actor-reasoning">{r.reasoning}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      {scan.summary && (
        <div className="ethics-panel__summary">
          <p>{scan.summary}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="ethics-panel__meta">
        {new Date(scan.scanned_at).toLocaleDateString()} · {scan.model_used}
      </div>
    </section>
  );
}
