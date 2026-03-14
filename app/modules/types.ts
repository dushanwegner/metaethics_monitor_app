import type { ComponentType } from 'react';
import type { StockDetail } from '../lib/types';

/** Props passed to every module panel component. */
export interface ModulePanelProps {
  stock: StockDetail;
}

/** Definition of a module that can be registered in the system. */
export interface ModuleDefinition {
  /** Unique identifier, e.g. "company-info", "news" */
  id: string;
  /** Human-readable name shown in settings */
  name: string;
  /** Where this module renders */
  mode: 'panel' | 'overlay' | 'both';
  /** Component rendered as a card/section below the chart */
  PanelComponent?: ComponentType<ModulePanelProps>;
  // OverlayComponent will be added when the chart engine supports it
}
