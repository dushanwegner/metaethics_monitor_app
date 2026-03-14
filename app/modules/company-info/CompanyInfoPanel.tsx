'use client';

import { useState } from 'react';
import type { ModulePanelProps } from '../types';

function formatEmployees(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

export default function CompanyInfoPanel({ stock }: ModulePanelProps) {
  const [open, setOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const hasDescription = !!stock.description;

  const infoItems: { label: string; value: string; isLink?: boolean }[] = [];
  if (stock.ceo) infoItems.push({ label: 'CEO', value: stock.ceo });
  if (stock.sector) infoItems.push({ label: 'Sector', value: stock.sector });
  if (stock.industry) infoItems.push({ label: 'Industry', value: stock.industry });
  if (stock.headquarters) infoItems.push({ label: 'HQ', value: stock.headquarters });
  if (stock.employees != null) infoItems.push({ label: 'Employees', value: formatEmployees(stock.employees)! });
  if (stock.website) infoItems.push({ label: 'Website', value: new URL(stock.website).hostname.replace(/^www\./, ''), isLink: true });

  if (!hasDescription && infoItems.length === 0) return null;

  return (
    <div className="company-info">
      <button className="company-info__header" onClick={() => setOpen(!open)}>
        <h2 className="company-info__title">About</h2>
        <span className={`company-info__chevron${open ? ' company-info__chevron--open' : ''}`}>&#x25B8;</span>
      </button>

      {open && (
        <>
          {hasDescription && (
            <>
              <p className={`company-info__description${!descExpanded ? ' company-info__description--truncated' : ''}`}>
                {stock.description}
              </p>
              <button className="company-info__toggle" onClick={() => setDescExpanded(!descExpanded)}>
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            </>
          )}

          {infoItems.length > 0 && (
            <div className="company-info__grid">
              {infoItems.map((item) => (
                <div key={item.label} className="company-info__item">
                  <div className="company-info__label">{item.label}</div>
                  {item.isLink ? (
                    <div
                      className="company-info__value company-info__value--link"
                      onClick={() => window.open(stock.website!, '_blank')}
                    >
                      {item.value}
                    </div>
                  ) : (
                    <div className="company-info__value">{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
