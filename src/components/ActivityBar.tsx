import { Files, Search, GitBranch, Database, Settings } from 'lucide-react';

export type ActivityView = 'explorer' | 'search' | 'source-control' | 'mcp';

interface ActivityBarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
  onSettingsClick: () => void;
}

export default function ActivityBar({ activeView, onViewChange, onSettingsClick }: ActivityBarProps) {
  const topItems: { id: ActivityView; icon: any; label: string }[] = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'source-control', icon: GitBranch, label: 'Source Control' },
    { id: 'mcp', icon: Database, label: 'MCP Servers' },
  ];

  return (
    <div className="w-[50px] flex flex-col items-center py-4 bg-muted/30 border-r border-border h-full">
      <div className="flex-1 flex flex-col gap-2 w-full">
        {topItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                relative w-full h-[42px] flex items-center justify-center
                group hover:bg-transparent
              `}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px] bg-foreground rounded-r-full" />
              )}
              <Icon
                className={`
                  w-6 h-6 transition-colors duration-200
                  ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}
                `}
              />
            </button>
          );
        })}
      </div>

      <div className="w-full flex flex-col gap-2">
        <button
          onClick={onSettingsClick}
          className="w-full h-[42px] flex items-center justify-center group"
          title="Settings"
        >
          <Settings
            className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200"
          />
        </button>
      </div>
    </div>
  );
}
