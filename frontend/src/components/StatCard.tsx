import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'normal' | 'alert' | 'success';
}

export const StatCard = ({ title, value, subtitle, icon: Icon, variant = 'normal' }: StatCardProps) => {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
};
