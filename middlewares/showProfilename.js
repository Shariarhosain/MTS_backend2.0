const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emitProfilename(io) {

    try {
        const profiles = await prisma.profile.findMany({
            select: { profile_name: true, id: true }
        });
        console.log('Profile Names:', profiles);
        io.emit('getProfilename', profiles);
    } catch (err) {
        console.error('[Socket] Failed to emit profile names:', err);
    }
}


module.exports = emitProfilename;