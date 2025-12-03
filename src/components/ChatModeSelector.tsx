import { MessageSquare, ListTodo, Bot } from 'lucide-react';
import type { ChatMode } from '../types/ide-types';

interface ChatModeSelectorProps {
    mode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
}

const MODES = [
    {
        id: 'ask' as ChatMode,
        label: 'Ask',
        icon: MessageSquare,
        description: 'Learning, planning, questions (no automatic changes)',
    },
    {
        id: 'plan' as ChatMode,
        label: 'Plan',
        icon: ListTodo,
        description: 'Break work into steps before executing',
    },
    {
        id: 'agent' as ChatMode,
        label: 'Agent',
        icon: Bot,
        description: 'Auto-run and auto-fix errors',
    },
];

export default function ChatModeSelector({ mode, onModeChange }: ChatModeSelectorProps) {
    return (
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
            {MODES.map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;

                return (
                    <button
                        key={m.id}
                        onClick={() => onModeChange(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-xs font-medium ${isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            }`}
                        title={m.description}
                    >
                        <Icon className="icon-xs" />
                        <span>{m.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
