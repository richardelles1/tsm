export type QuantityStatement = {
  type: "quantity";
  dollars_per_unit: number;
  label: string;
};

export type GeneralStatement = {
  type: "general";
  description: string;
};

export type ImpactStatement = QuantityStatement | GeneralStatement;

export function computeImpact(statement: ImpactStatement, amountCents: number): string {
  const dollars = amountCents / 100;
  if (statement.type === "quantity") {
    const count = Math.round(dollars / statement.dollars_per_unit);
    if (count <= 0) return `$${dollars} toward ${statement.label}`;
    const plural = count !== 1 && !statement.label.endsWith("s") ? `${statement.label}s` : statement.label;
    return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)} = ${count.toLocaleString()} ${plural}`;
  }
  const dollarsStr = dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2);
  return `$${dollarsStr} ${statement.description}`;
}

export function pickStatement(
  statements: ImpactStatement[],
  seed: string
): ImpactStatement | null {
  if (!statements || statements.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return statements[hash % statements.length];
}
