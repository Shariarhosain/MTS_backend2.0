const express = require('express');
const http = require('http');
const cors = require('cors');
const ProjectRoute = require('./routes/ProjectRoute');
const ProfileRoute = require('./routes/profileRoute');
const todayTaskRoute = require('./routes/todayTaskRoute');
const DepartmentRoute = require('./routes/departmentRoute');
const TeamRoute = require('./routes/teamRoute');
const cookieParser = require('cookie-parser');
const verifyToken = require('./middlewares/jwt');
const { PrismaClient } = require('@prisma/client'); // Import PrismaClient
const { Decimal } = require('@prisma/client/runtime/library'); // Import Decimal for calculations
const cron = require('node-cron'); // Import node-cron

const { initSocket, getIO } = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Prisma Client
const prisma = new PrismaClient();

initSocket(server); // ✅ Initialize Socket.IO here

// Middleware setup
app.use(cors({
  origin: '*', // Be cautious with '*' in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser()); // This should be before your routes

// Routes
// Pass the getIO function where needed
app.use('/api/project', verifyToken, ProjectRoute(getIO)); // Ensure ProjectRoute is returning a function
app.use('/api/teamMember', require('./routes/teamMemberRoute'));
app.use('/api/profile', ProfileRoute);
app.use('/api/today-task', verifyToken, todayTaskRoute); // Ensure todayTaskRoute is returning a function
app.use('/api/department', verifyToken, DepartmentRoute); // Ensure DepartmentRoute is returning a function
app.use('/api/team', verifyToken, TeamRoute); // Ensure TeamRoute is returning a function

// --- Cron Job Definition ---
// Function to calculate and record monthly targets and achievements
async function recordMonthlyTargetsAndAchievements() {
    console.log('Running monthly target and achievement recording cron job...');

    try {
        // Calculate the date range for the month that just ended
        const now = new Date();
        const endOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

        // This check ensures the core logic only runs on the last minute of the last day
        if (now.getUTCMonth() !== endOfCurrentMonth.getUTCMonth() ||
            now.getUTCDate() !== endOfCurrentMonth.getUTCDate() ||
            now.getUTCHours() !== 23 ||
            now.getUTCMinutes() !== 59) {
            // console.log('Cron triggered, but not the last minute of the month. Skipping execution.');
            return;
        }

        console.log(`Recording data for month: ${startOfCurrentMonth.toISOString()} to ${endOfCurrentMonth.toISOString()}`);

        // --- Record Team History ---
        const teams = await prisma.team.findMany({
            include: {
                team_member: {
                    select: {
                        id: true,
                        role: true,
                        first_name: true, // Include first name for history table
                        last_name: true, // Include last name for history table
                    },
                },
            },
        });

        for (const team of teams) {
            let teamMonthlyAchievement = new Decimal(0);
            const isSalesTeam = team.team_member.some(member => member.role?.toLowerCase().startsWith('sales_'));

            if (isSalesTeam) {
                // Sales Team Achievement: Sum of non-cancelled projects ordered by team members in the current month
                const teamMemberIds = team.team_member.map(member => member.id);
                if (teamMemberIds.length > 0) {
                    const salesProjects = await prisma.project.findMany({
                        where: {
                            ordered_by: { in: teamMemberIds },
                            date: {
                                gte: startOfCurrentMonth,
                                lte: endOfCurrentMonth,
                            },
                            status: { not: 'cancelled' },
                        },
                        select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
                    });
                    teamMonthlyAchievement = salesProjects.reduce((sum, project) =>
                        sum.plus(new Decimal(project.after_fiverr_amount || 0)).plus(new Decimal(project.after_Fiverr_bonus || 0))
                        , new Decimal(0));
                }

            } else {
                // Operations Team Achievement: Sum of delivered projects assigned to this team in the current month
                const opsProjects = await prisma.project.findMany({
                    where: {
                        team_id: team.id,
                        is_delivered: true,
                        delivery_date: {
                            gte: startOfCurrentMonth,
                            lte: endOfCurrentMonth,
                        },
                    },
                    select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
                });
                teamMonthlyAchievement = opsProjects.reduce((sum, project) =>
                    sum.plus(new Decimal(project.after_fiverr_amount || 0)).plus(new Decimal(project.after_Fiverr_bonus || 0))
                    , new Decimal(0));
            }

             // Get team member names as a comma-separated string
            const teamMemberNames = team.team_member
                .map(member => `${member.first_name || ''} ${member.last_name || ''}`.trim())
                .filter(name => name) // Filter out empty names
                .join(', ');

            // Record team history
            await prisma.TeamTargetHistory.create({
                data: {
                    team_id: team.id,
                    team_name: team.team_name || 'Unknown Team', // Include team name
                    team_target: new Decimal(team.team_target || 0),
                    team_member_names: teamMemberNames, // Include team member names
                    total_achived: teamMonthlyAchievement, // Use total_achived as per your schema
                    start_date: startOfCurrentMonth,
                    end_date: endOfCurrentMonth,
                },
            });
            console.log(`Recorded monthly history for Team ${team.team_name || team.id}`);
        }

        // --- Record Team Member History ---
        const teamMembers = await prisma.team_member.findMany({
            include: {
                team: { // Include team to get team_id and team_name
                    select: {
                        id: true,
                        team_name: true
                    }
                }
            }
        });

        for (const member of teamMembers) {
            let memberMonthlyAchievement = new Decimal(0);
            const memberRole = member.role?.toLowerCase();

            if (memberRole?.startsWith('sales_')) {
                // Sales Member Achievement: Sum of non-cancelled projects ordered by this member in the current month
                const salesProjects = await prisma.project.findMany({
                    where: {
                        ordered_by: member.id,
                        date: {
                            gte: startOfCurrentMonth,
                            lte: endOfCurrentMonth,
                        },
                        status: { not: 'cancelled' },
                    },
                    select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
                });
                memberMonthlyAchievement = salesProjects.reduce((sum, project) =>
                    sum.plus(new Decimal(project.after_fiverr_amount || 0)).plus(new Decimal(project.after_Fiverr_bonus || 0))
                    , new Decimal(0));

            } else {
                // Operations Member Achievement: Sum of amounts from member_distribution for projects
                // assigned to their team and delivered in the current month, where this member received distribution.
                if (member.team_id) {
                    const distributions = await prisma.member_distribution.findMany({
                        where: {
                            team_member_id: member.id,
                            project: { // Filter by project details
                                team_id: member.team_id, // Assigned to the member's team
                                is_delivered: true,
                                delivery_date: { // Delivered in the current month
                                    gte: startOfCurrentMonth,
                                    lte: endOfCurrentMonth,
                                },
                            },
                        },
                        select: { amount: true },
                    });
                    memberMonthlyAchievement = distributions.reduce((sum, distribution) =>
                        sum.plus(new Decimal(distribution.amount || 0))
                        , new Decimal(0));
                }
            }

            // Record team member history
            await prisma.TeamMemberTargetHistory.create({
                data: {
                    team_member_id: member.id,
                    team_member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(), // Include member name
                    target_amount: new Decimal(member.target || 0),
                    total_achived: memberMonthlyAchievement, // Use total_achived as per your schema
                    team_id: member.team_id || null, // Include team_id
                    team_name: member.team?.team_name || 'Unknown Team', // Include team_name
                    start_date: startOfCurrentMonth,
                    end_date: endOfCurrentMonth,
                },
            });
            console.log(`Recorded monthly history for Team Member ${member.first_name || member.id}`);
        }

        console.log('Monthly target and achievement recording cron job finished successfully for the current month.');

    } catch (error) {
        console.error('Error in monthly target and achievement recording cron job:', error);
        // Consider adding more robust error logging or alerting here
    }
    // Removed prisma.$disconnect() as it's a long-running server
}

// Schedule the cron job
// This will run the job every day at 23:59 UTC.
// The date check inside the function ensures the main logic
// only executes on the last day of the month at that time.
cron.schedule('59 23 * * *', recordMonthlyTargetsAndAchievements, {
  scheduled: true,
  timezone: "UTC" // Use UTC timezone for cron schedule
});
// Log the cron job schedule


console.log('Monthly target and achievement recording cron job scheduled for 23:59 UTC daily, with last-day-of-month check.');


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});
// Add this temporary route *before* your error handling middleware
// Start the server
server.listen(3000, async () => {
  console.log(`Server is running on http://localhost:3000`);
  console.log('Socket.IO server is running');
  console.log('node-cron job is scheduled to run at 23:59 UTC daily');

});

// Handle graceful shutdown (optional but recommended)
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect(); // Disconnect Prisma client on shutdown
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
   await prisma.$disconnect(); // Disconnect Prisma client on shutdown
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});