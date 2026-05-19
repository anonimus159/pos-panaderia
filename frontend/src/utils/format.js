export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$ 0 COP';
  
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(amount)} COP`;
};
