'use client';

import { useCallback, useEffect, useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

interface ArticleIdea {
  item_key: string;
  title: string;
  source: string;
  summary: string;
  category: string;
  dimensions: { tension: string; explanation?: string }[];
  scenario_slug: string;
  scenario_score: number;
  suggested_voice?: string;
  suggested_voice_name?: string;
}

interface Voice {
  slug: string;
  name: string;
  description: string;
}

export default function IdeasTab() {
  const { handleError } = useAuth();
  const [ideas, setIdeas] = useState<ArticleIdea[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ideasData, voicesData] = await Promise.all([
        apiGet('/api/v1/article-ideas/') as Promise<any>,
        apiGet('/api/v1/voices/') as Promise<any>,
      ]);
      setIdeas(ideasData.article_ideas || []);
      setVoices((voicesData.voices || []).filter((v: Voice) => v.slug !== 'the-correspondent'));
    } catch (e) { handleError(e); }
    setLoading(false);
  }, [handleError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h1>Article Ideas</h1>
        <button className="tab-header__action" onClick={fetchData} aria-label="Refresh">
          <TbRefresh size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {loading && ideas.length === 0 ? (
        <p className="tab-empty">Loading...</p>
      ) : ideas.length === 0 ? (
        <p className="tab-empty">No article ideas yet. Analyze headlines first.</p>
      ) : (
        <div className="ideas-list">
          {ideas.map(idea => (
            <div key={idea.item_key} className="idea-card">
              <div
                className="idea-card__header"
                onClick={() => setExpanded(expanded === idea.item_key ? null : idea.item_key)}
              >
                <span className="idea-card__title">{idea.title}</span>
                <span className="idea-card__meta">
                  {idea.suggested_voice_name && (
                    <span className={`voice-badge voice-badge--${idea.suggested_voice}`}>
                      {idea.suggested_voice_name}
                    </span>
                  )}
                  <span className="idea-card__score">s:{idea.scenario_score}</span>
                </span>
              </div>

              {expanded === idea.item_key && (
                <div className="idea-card__body">
                  {idea.summary && <p className="idea-card__summary">{idea.summary}</p>}

                  {idea.dimensions?.length > 0 && (
                    <div className="idea-card__dims">
                      {idea.dimensions.map((d, i) => (
                        <div key={i} className="idea-dim">{d.tension}</div>
                      ))}
                    </div>
                  )}

                  <div className="idea-card__voices">
                    <span className="idea-card__voices-label">Voices:</span>
                    {voices.map(v => (
                      <span key={v.slug} className={`voice-badge voice-badge--${v.slug}`}>
                        {v.name}
                      </span>
                    ))}
                  </div>

                  <div className="idea-card__foot">
                    <span>{idea.source}</span>
                    <span>scenario: {idea.scenario_slug}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
