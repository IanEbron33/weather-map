import { LayoutDashboard, MessageCircle, Layers } from 'lucide-react';

export default function MobileBottomNav({
  sidebarOpen,
  aiPanelOpen,
  mapLayerSheetOpen,
  onToggleSidebar,
  onToggleAiPanel,
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
      id: 'map-layer',
      label: 'Map Layer',
      icon: Layers,
      active: mapLayerSheetOpen,
      onClick: onToggleMapLayerSheet,
    },
  ];

  const activeIndex = buttons.findIndex((btn) => btn.active);

  return (
    <nav className="mobile-bottom-nav md:hidden">
      <div 
        className="mobile-nav-pill" 
        style={activeIndex !== -1 ? {
          transform: `translateX(${activeIndex * 100}%)`,
          opacity: 1
        } : {
          opacity: 0
        }}
      />
      {buttons.map((btn) => {
        const Icon = btn.icon;
        return (
          <button
            key={btn.id}
            id={`mobile-nav-${btn.id}`}
            onClick={btn.onClick}
            className={`mobile-bottom-nav-btn${btn.active ? ' mobile-bottom-nav-btn-active' : ''}`}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={20} strokeWidth={btn.active ? 2.2 : 1.8} />
            </div>
            <span>{btn.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
