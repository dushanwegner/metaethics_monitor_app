import type { ModuleDefinition } from '../types';
import StockNewsPanel from './StockNewsPanel';

const stockNewsModule: ModuleDefinition = {
  id: 'stock-news',
  name: 'News',
  mode: 'panel',
  PanelComponent: StockNewsPanel,
};

export default stockNewsModule;
