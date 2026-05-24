import { LayoutDashboard, MessageCircle, LocateFixed, Layers } from 'lucide-react';

export default function MobileBottomNav({
  sidebarOpen,
  aiPanelOpen,
  mapLayerSheetOpen,
  onToggleSidebar,
  onToggleAiPanel,
  onGeoLocate,
  onToggleMapLayerSheet,
}) {
  const buttons = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: sidebarOpen,
      onClick: onToggleSidebar,
    },
    {
      id: 'cloudly',
      label: 'Cloudly',
      icon: MessageCircle,
      active: aiPanelOpen,
      onClick: onToggleAiPanel,
    },
    {
      id: 'locate',
      label: 'Locate',
      icon: LocateFixed,
      active: false,
      onClick: onGeoLocate,
    },
    {
      id: 'map-layer',
      label: 'Map Layer',
      icon: Layers,
      active: mapLayerSheetOpen,
      onClick: onToggleMapLayerSheet,
    },
  ];

  return (
    <nav className="mobile-bottom-nav md:hidden">
      {buttons.map((btn) => {
        const Icon = btn.icon;
        return (
          <button
            key={btn.id}
            id={`mobile-nav-${btn.id}`}
            onClick={btn.onClick}
            className={`mobile-bottom-nav-btn${btn.active ? ' mobile-bottom-nav-btn-active' : ''}`}
          >
            <Icon size={20} strokeWidth={btn.active ? 2.2 : 1.8} />
            <span>{btn.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
