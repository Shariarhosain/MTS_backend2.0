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
          { date: { lte: endOfCurrentMonth } },
          { delivery_date: { lte: endOfCurrentMonth } },
        ],
      },
    });

    // Initialize money totals
    let total_operations = 0;
    let total_sales = 0;
    let total_assign = 0;
    let need_to_assign = 0;
    let carry_operation = 0;
    let carry_pm = 0;

    projects.forEach(p => {
      const amt = parseInt(p.order_amount) || 0; // Ensure amount is a number
      const isThisMonthDelivery = p.delivery_date && p.delivery_date >= startOfCurrentMonth && p.delivery_date <= endOfCurrentMonth;
      const isThisMonthProject = p.date && p.date >= startOfCurrentMonth && p.date <= endOfCurrentMonth;
      const isPastProject = p.date && p.date < startOfCurrentMonth;

      // total_operations: delivered this
      if (p.is_delivered && isThisMonthDelivery) total_operations += amt;

      // total_sales: created this month
      if (isThisMonthProject) total_sales += amt;

      // total_assign: assigned, not delivered, delivery set this month --carry soho
      if (p.Assigned_date && !p.is_delivered && isThisMonthDelivery) total_assign += amt;

      // need_to_assign: status === 'nra'+ team assigned date is null
      if (p.status === 'nra') need_to_assign += amt;

      // carry_operation: project is from this or earlier month AND status = revision/realrevision assign date previous month 
      if ((isThisMonthProject || isPastProject) && ['revision', 'realrevision'].includes(p.status)) {
        carry_operation += amt;
      }

      // carry_pm: project is from previous month AND unassigned
      if (isPastProject && !p.Assigned_date) {
        carry_pm += amt;
      }
    });

    const total_carry = carry_operation + carry_pm;

    const result = {
      total_operations,
      total_sales,
      total_assign,
      need_to_assign,
      carry_operation,
      carry_pm,
      total_carry,
    };

    io.emit('projectMoneyMetrics', result);
    console.log('📊 Project Money Metrics (Updated):', result);

  } catch (error) {
    console.error('[Money Metrics] Failed:', error);
  }
}

module.exports = emitProjectMoneyMetrics;
