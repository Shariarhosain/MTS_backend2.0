// 🔄 utils/salesEmitter.js or similar

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emitSalesData(io) {
    try {
        const currentDate = new Date();
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endOfCurrentMonth.setHours(23, 59, 59, 999);

        const salesData = await prisma.project.groupBy({
            by: ['profile_id'],
            where: {
                date: {
                    gte: startOfCurrentMonth,
                    lte: endOfCurrentMonth
                }
            },
            _sum: {
                after_fiverr_amount: true,
                after_Fiverr_bonus: true
            }
        });

        const salesDataWithProfileName = await Promise.all(salesData.map(async (data) => {
            if (data.profile_id) {
                const profile = await prisma.profile.findUnique({
                    where: { id: data.profile_id },
                    select: { profile_name: true }
                });
                return {
                    profile_name: profile?.profile_name || 'Unknown',
                    total_sales: Number(data._sum.after_fiverr_amount || 0) + Number(data._sum.after_Fiverr_bonus || 0),
                };
            } else {
                return {
                    profile_name: 'Unknown',
                    total_sales: Number(data._sum.after_fiverr_amount || 0) + Number(data._sum.after_Fiverr_bonus || 0),
                };
            }
        }));

        io.emit('salesDataEachProfile', salesDataWithProfileName);
        console.log('[Socket] salesData emitted:', salesDataWithProfileName);
    } catch (err) {
        console.error('[Socket] Failed to emit salesData:', err);
    }
}


module.exports = emitSalesData;
