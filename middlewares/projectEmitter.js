const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function emitProjectDistributionCurrentMonth(io) {
    try {


        const currentDate = new Date();
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endOfCurrentMonth.setHours(23, 59, 59, 999);

        const projectCurrent = await prisma.project.findMany({
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth
                }
            },
            select: {
                project_name: true,
                after_fiverr_amount: true,
                after_Fiverr_bonus: true            
            }
          
            
        });

        console.log('Current Projects:', projectCurrent);

        

        io.emit('emitProjectDistributionCurrentMonth', projectCurrent);

    }catch (err) {
        console.error('[Socket] Failed to emit salesData:', err);
    }
}

module.exports = emitProjectDistributionCurrentMonth;
