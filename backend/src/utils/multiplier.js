const getMultiplier = (weightChoice) => {
  if (!weightChoice) return 1;
  const clean = weightChoice.toLowerCase().trim();
  if (clean.endsWith('kg')) {
    return parseFloat(clean) || 1;
  }
  if (clean.endsWith('g') || clean.endsWith('gm') || clean.endsWith('gms')) {
    const val = parseFloat(clean);
    return val ? val / 1000 : 1;
  }
  const val = parseFloat(clean);
  return val ? val / 1000 : 1;
};

module.exports = { getMultiplier };
