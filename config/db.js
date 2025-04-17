//connect database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

exports.prisma = prisma; // Export the Prisma client instance for use in other files
