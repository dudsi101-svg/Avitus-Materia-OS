import Link from 'next/link';
import { realizations } from '../lib/realizations';

export function RealizationGrid({ limit }: { limit?: number }) {
  const items = typeof limit === 'number' ? realizations.slice(0, limit) : realizations;
  return (
    <div className="v04RealizationGrid">
      {items.map((item) => (
        <article className="v04RealizationCard" key={item.code}>
          <div
            className="v04RealizationImage"
            role="img"
            aria-label={item.title}
            style={{ backgroundImage: `linear-gradient(180deg, transparent 42%, rgba(12,11,10,.76)), url(${item.image})` }}
          >
            <span>{item.collection}</span>
          </div>
          <div className="v04RealizationCopy">
            <small>{item.code}</small>
            <h3>{item.title}</h3>
            <p>{item.note}</p>
            <Link href={`/kreator?inspiracja=${item.code}`}>Zainspiruj się tą realizacją →</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
