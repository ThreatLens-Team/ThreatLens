
import "./StatCard.css";

function StatCard({ title, value, subtitle, variant = "default" }) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card-title">{title}</span>
      <h2 className="stat-card-value">{value}</h2>
      <p className="stat-card-subtitle">{subtitle}</p>
    </div>
  );
}

export default StatCard;
