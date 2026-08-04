interface Props {
  title: string;
}

export function AppHeader({ title }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-4 md:px-6">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
    </header>
  );
}
