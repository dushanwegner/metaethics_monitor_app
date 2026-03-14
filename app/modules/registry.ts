import type { ModuleDefinition } from './types';
import companyInfoModule from './company-info';
import stockNewsModule from './stock-news';

/** All available modules. Order determines default rendering order. */
const modules: ModuleDefinition[] = [
  companyInfoModule,
  stockNewsModule,
];

export default modules;
