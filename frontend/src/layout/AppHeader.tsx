import { Menu } from 'lucide-react';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function AppHeader({ title, onMenuClick }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="text-text-muted hover:text-text-primary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
    </header>
  );
}
