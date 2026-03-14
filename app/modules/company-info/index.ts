import type { ModuleDefinition } from '../types';
import CompanyInfoPanel from './CompanyInfoPanel';

const companyInfoModule: ModuleDefinition = {
  id: 'company-info',
  name: 'Company Info',
  mode: 'panel',
  PanelComponent: CompanyInfoPanel,
};

export default companyInfoModule;
