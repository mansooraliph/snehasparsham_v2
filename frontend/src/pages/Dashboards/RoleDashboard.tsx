interface RoleDashboardProps {
  title: string;
}

/** Placeholder landing page per role — replaced as each module ships. */
export function RoleDashboard({ title }: RoleDashboardProps) {
  return (
    <div>
      <p className="text-text-muted">{title} — this page is a placeholder until its module ships.</p>
    </div>
  );
}
