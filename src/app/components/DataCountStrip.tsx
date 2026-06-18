export function DataCountStrip({ items }: { items: Array<[string, number]> }) {
  return (
    <dl className="data-count-strip">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          {' '}
          <dd>{value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}
