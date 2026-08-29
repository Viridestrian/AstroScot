interface InfoCardProps {
  eyebrow: string;
  title: string;
  icon: string;
  className: string;
  items: string[];
  message: string;
}

export function InfoCard({ eyebrow, title, icon, className, items, message }: InfoCardProps) {
  return (
    <article className={`info-card ${className}`}>
      <div className="card-header">
        <div>
          <p className="card-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="card-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <ul className="feature-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="placeholder-note">Placeholder: {message}</p>
    </article>
  );
}
