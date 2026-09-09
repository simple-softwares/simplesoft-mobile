/**
 * Pricing utilities for calculating discounts and tier prices
 * Since the backend doesn't store discount percentages, we calculate them
 * by comparing monthly vs annual pricing
 */

/**
 * Calculate discount percentage based on monthly and annual prices
 * @param {number} monthlyPrice - Price per month
 * @param {number} annualPrice - Total annual price (12 months)
 * @returns {number} Discount percentage (0-100)
 */
export const calculateDiscount = (monthlyPrice, annualPrice) => {
  if (!monthlyPrice || monthlyPrice === 0) return 0;
  const fullYearPrice = monthlyPrice * 12;
  const discount = ((fullYearPrice - annualPrice) / fullYearPrice) * 100;
  return Math.round(discount * 10) / 10; // Round to 1 decimal place
};

/**
 * Calculate discount amount in currency
 * @param {number} monthlyPrice - Price per month
 * @param {number} annualPrice - Total annual price
 * @returns {number} Discount amount in currency
 */
export const calculateDiscountAmount = (monthlyPrice, annualPrice) => {
  if (!monthlyPrice || monthlyPrice === 0) return 0;
  const fullYearPrice = monthlyPrice * 12;
  return Math.max(0, fullYearPrice - annualPrice);
};

/**
 * Transform raw pricing tiers from server to frontend format
 * Only keeps 1_month and 12_months, calculates discounts
 * @param {object} pricingTiers - Raw pricing tiers from server
 * @returns {object} Transformed pricing tiers
 */
export const transformPricingTiers = (pricingTiers) => {
  if (!pricingTiers) return {};

  const monthlyTier = pricingTiers['1_month'];
  const annualTier = pricingTiers['12_months'];

  if (!monthlyTier || !annualTier) {
    return pricingTiers; // Return as-is if missing data
  }

  const monthlyPrice = monthlyTier.monthly_price || 0;
  const annualPrice = annualTier.total_price || monthlyPrice * 12;

  // Calculate discount for annual tier
  const discountPercent = calculateDiscount(monthlyPrice, annualPrice);
  const discountAmount = calculateDiscountAmount(monthlyPrice, annualPrice);

  return {
    '1_month': {
      months: 1,
      monthly_price: monthlyPrice,
      discount: 0,
      discount_amount: 0,
      total_price: monthlyPrice,
    },
    '12_months': {
      months: 12,
      monthly_price: monthlyPrice,
      discount: discountPercent,
      discount_amount: discountAmount,
      total_price: annualPrice,
    },
  };
};
