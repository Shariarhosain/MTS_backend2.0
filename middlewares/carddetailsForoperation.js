const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emitProjectMoneyMetrics(io) {
  const now = new Date();

  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { date: { lte: endOfCurrentMonth } }, // Project creation date
          { delivery_date: { lte: endOfCurrentMonth } }, // Project delivery date
        ],
      },
    });

    // Initialize money totals
    let total_operations = 0;
    let total_sales = 0;
    let total_assign = 0;
    let need_to_assign = 0;
    let carry_operation = 0; // Carry over for operations (old or current projects, not delivered)
    let carry_pm = 0; // Carry over for PM (old projects, not yet assigned)
    let cancelled = 0;
let total_carry = 0;

    projects.forEach(p => {
      const amt = parseInt(p.after_fiverr_amount) || 0;

      if (p.status === 'cancelled') {
        cancelled += amt;
        return; // Exit this loop iteration early
      }

      // Determine date contexts
      const isThisMonthDelivery = p.delivery_date && p.delivery_date >= startOfCurrentMonth && p.delivery_date <= endOfCurrentMonth;
      const isThisMonthProject = p.date && p.date >= startOfCurrentMonth && p.date <= endOfCurrentMonth;
      const isPastProject = p.date && p.date < startOfCurrentMonth;

      // total_operations: delivered this month
      if (p.is_delivered && isThisMonthDelivery) total_operations += amt;

      // total_sales: created this month
      if (isThisMonthProject) total_sales += amt;

      // total_assign: assigned, not delivered (regardless of creation/delivery date relative to this month, as long as queried)
      if (p.Assigned_date && !p.is_delivered) total_assign += amt;

      // need_to_assign: not assigned (Assigned_date is null), and not cancelled
      if (!p.Assigned_date) need_to_assign += amt;

      // carry_operation: old or current project AND not delivered (potentially in revision or waiting for delivery)
         // Note: The original code comment said "revision status", but the logic is !p.is_delivered. Let's stick to the code's logic.
      if (isPastProject && !p.is_delivered && p.Assigned_date) {
        carry_operation += amt;
      }

      // carry_pm: old project AND not yet assigned
      if (isPastProject && !p.Assigned_date) {
        carry_pm += amt;
      }
//if delivery date is in this month but project from past
      if (isPastProject && !p.is_delivered || isThisMonthDelivery && isPastProject) {
        total_carry += amt;
      }

    
    });

   

    const result = {
      total_operations,
      total_sales,
      total_assign,
      need_to_assign,
      carry_operation,
      carry_pm,
      total_carry, // This is the sum of carry_operation and carry_pm
      cancelled,
    };

    io.emit('projectMoneyMetrics', result);
    console.log('📊 Project Money Metrics (Updated):', result);

  } catch (error) {
    console.error('[Money Metrics] Failed:', error);
  }
}

module.exports = emitProjectMoneyMetrics;