'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TbArrowLeft, TbChevronRight } from 'react-icons/tb';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';
import TabMenu from '../components/TabMenu';
import type { TabMenuSection } from '../components/TabMenu';
import type {
  AcademySection, AcademyListResponse, AcademyArticleResponse,
} from '../lib/types';

// ---------------------------------------------------------------------------
// View state
// ---------------------------------------------------------------------------
type View =
  | { screen: 'list' }
  | { screen: 'article'; slug: string; title: string; section: string };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DocsTab() {
  const { handleError } = useAuth();
  const [sections, setSections] = useState<AcademySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ screen: 'list' });

  // Active section filter (for hamburger quick-nav)
  const [activeSection, setActiveSection] = useState('all');

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<AcademyListResponse>('/api/academy/');
      setSections(data.sections);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  // Build hamburger menu from sections
  const menuSections: TabMenuSection[] = useMemo(() => {
    const totalArticles = sections.reduce((n, s) => n + s.articles.length, 0);
    const items = [
      { id: 'all', label: `All (${totalArticles})` },
      ...sections.map(s => ({
        id: s.name,
        label: `${s.name} (${s.articles.length})`,
      })),
    ];
    return [{ items }];
  }, [sections]);

  // Filter sections by active selection
  const visibleSections = activeSection === 'all'
    ? sections
    : sections.filter(s => s.name === activeSection);

  const isDeep = view.screen !== 'list';

  return (
    <div className="tab-content">
      {!isDeep && (
        <div className="tab-header">
          <h1 className="tab-header__title">Docs</h1>
          <div className="tab-header__right">
            <TabMenu sections={menuSections} activeId={activeSection} onSelect={setActiveSection} />
          </div>
        </div>
      )}

      {view.screen === 'list' && (
        <>
          {loading && sections.length === 0 ? (
            <div className="skeleton-list">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : visibleSections.length === 0 ? (
            <div className="tab-empty"><p>No docs available.</p></div>
          ) : (
            visibleSections.map(section => (
              <div key={section.name} className="docs-section">
                <div className="docs-section__title">{section.name}</div>
                {section.articles.map(article => (
                  <button
                    key={article.slug}
                    className="docs-article-row"
                    onClick={() => setView({
                      screen: 'article',
                      slug: article.slug,
                      title: article.title,
                      section: section.name,
                    })}
                  >
                    <span className="docs-article-row__title">{article.title}</span>
                    <TbChevronRight size={18} className="docs-article-row__arrow" />
                  </button>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {view.screen === 'article' && (
        <ArticleView
          slug={view.slug}
          title={view.title}
          onBack={() => setView({ screen: 'list' })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Article reader
// ---------------------------------------------------------------------------
function ArticleView({
  slug, title, onBack,
}: {
  slug: string;
  title: string;
  onBack: () => void;
}) {
  const { handleError } = useAuth();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<AcademyArticleResponse>(`/api/academy/${slug}/`)
      .then(data => setHtml(data.html))
      .catch(err => handleError(err))
      .finally(() => setLoading(false));
  }, [slug, handleError]);

  return (
    <>
      <div className="tab-header">
        <button className="tab-header__action" onClick={onBack} aria-label="Back">
          <TbArrowLeft size={20} />
        </button>
        <h1 className="tab-header__title">{title}</h1>
      </div>

      {loading ? (
        <div className="skeleton-list">
          <div className="skeleton-card" style={{ height: 200 }} />
        </div>
      ) : (
        <div className="docs-reader">
          <div
            className="docs-reader__html"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
    </>
  );
}
