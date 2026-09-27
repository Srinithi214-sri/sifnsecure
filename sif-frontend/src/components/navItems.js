import { ClipboardCheck, FilePlus, LayoutDashboard, ScanSearch, TableProperties } from 'lucide-react';

// Sidebar links and page titles
export const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'SIF precursor trends across Oil India sites',
  },
  {
    to: '/submit',
    label: 'Submit report',
    icon: FilePlus,
    description: 'Describe an unsafe act, unsafe condition or near miss',
  },
  {
    to: '/analysis',
    label: 'Analysis result',
    icon: ScanSearch,
    description: 'SIF score, energy estimate and matched life-saving rule',
  },
  {
    to: '/review',
    label: 'Review queue',
    icon: ClipboardCheck,
    description: 'Pending reports, including ML and EEI disagreements',
  },
  {
    to: '/reports',
    label: 'Report explorer',
    icon: TableProperties,
    description: 'Search and filter every safety report',
  },
];

export function findNavItem(pathname) {
  return (
    NAV_ITEMS.find((item) => item.to !== '/' && pathname.startsWith(item.to)) ??
    NAV_ITEMS.find((item) => item.to === pathname) ??
    NAV_ITEMS[0]
  );
}
