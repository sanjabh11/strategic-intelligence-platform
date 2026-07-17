const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveProofDate(args, now = new Date()) {
  const index = args.indexOf('--proof-date');
  if (index >= 0 && !args[index + 1]) throw new Error('--proof-date requires YYYY-MM-DD');
  const value = index >= 0
    ? args[index + 1]
    : [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

  if (!DATE_PATTERN.test(value)) throw new Error(`Invalid proof date "${value}"; expected YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Invalid calendar proof date "${value}"`);
  }
  return value;
}

export function proofTimestamp(proofDate, daysAfter = 0) {
  const instant = new Date(`${proofDate}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + daysAfter);
  return instant.toISOString();
}

export function assertArtifactDate(filePath, proofDate, label) {
  const match = filePath.match(/(\d{4}-\d{2}-\d{2})/);
  if (match && match[1] !== proofDate) {
    throw new Error(`${label} date (${match[1]}) does not match proof date (${proofDate})`);
  }
}
