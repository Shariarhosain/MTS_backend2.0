const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function totalOrdersCardData(io) {
  try {
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);
   
    const totalOrdersAmount = await prisma.project.aggregate({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      _sum: {
        after_fiverr_amount: true,
        after_Fiverr_bonus: true,
      },
    });

    const totalDeliverySum = await prisma.project.aggregate({
      where: {
        ops_status: 'delivered',
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      _sum: {
        after_fiverr_amount: true,
      },
    });

    const totalCancelSum = await prisma.project.aggregate({
      where: {
        ops_status: 'canceled',
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      _sum: {
        after_fiverr_amount: true,
      },
    });

    const todaySales = await prisma.project.aggregate({
      where: {
        ops_status: 'completed',
        status: 'completed',
        date: {
         gte: new Date(new Date().setHours(0, 0, 0, 0)), //today date
         lte: new Date(new Date().setHours(23, 59, 59, 999)), //end of today
        },
      },
      _sum: {
        after_fiverr_amount: true,
        after_Fiverr_bonus: true,
      },
    });

    const totalDeliverySumAmount = (totalDeliverySum._sum.after_fiverr_amount || 0) + (totalDeliverySum._sum.after_Fiverr_bonus || 0);
    console.log('Total Delivery Sum:', totalDeliverySumAmount);

    const totalCancelSumAmount = (totalCancelSum._sum.after_fiverr_amount || 0) + (totalCancelSum._sum.after_Fiverr_bonus || 0);
    console.log('Total Cancel Sum:', totalCancelSumAmount);

    const todaySalesAmount = (todaySales._sum.after_fiverr_amount || 0) + (todaySales._sum.after_Fiverr_bonus || 0);
    console.log('Today Sales Amount:', todaySalesAmount);


    //add the total amount of after_fiverr_amount and after_Fiverr_bonus
    const totalAmount = (totalOrdersAmount._sum.after_fiverr_amount || 0) + (totalOrdersAmount._sum.after_Fiverr_bonus || 0);
    console.log('Total Orders Amount:', totalAmount);
    io.emit("totalOrdersCardData",{
        totalOrdersAmount: totalAmount,
        totalDeliverySum: totalDeliverySumAmount,
        totalCancelSum: totalCancelSumAmount,
        todaySales: todaySalesAmount,

    });



  } catch (error) {
    console.error("Error retrieving total orders:", error);
    io.emit("totalOrdersCardError", {
      message: "Error retrieving total orders.",
      error: error.message,
    });
  }
}

module.exports = totalOrdersCardData;
