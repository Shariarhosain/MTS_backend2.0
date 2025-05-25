// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const axios = require('axios');
// const {
//     format,
//     isAfter,
//     setHours,
//     setMinutes,
//     setSeconds,
//     startOfDay,
//     endOfDay,
//     parse,
//     startOfMonth,
//     endOfMonth
// } = require('date-fns');

// // Configuration
// const API_HOST = "192.168.10.252";
// const API_PORT = "8088";
// const API_USERNAME = "admin";
// const API_PASSWORD = "Admin@123";
// const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

// // --- Helper function to get the auth token for the external API ---
// async function getAuthToken() {
//     try {
//         const response = await axios.post(`${API_BASE_URL}/api-token-auth/`, {
//             username: API_USERNAME,
//             password: API_PASSWORD
//         }, {
//             headers: { "Content-Type": "application/json" }
//         });
//         return response.data.token;
//     } catch (error) {
//         console.error("Error getting external API auth token:", error.response ? error.response.data : error.message);
//         throw new Error("External API Authentication failed"); // Propagate error
//     }
// }

// // --- Core Internal Logic for Processing and Saving Daily Attendance ---
// async function _internalProcessAndSaveDailyAttendanceLogic(emp_code_param) {
//     const emp_code = String(emp_code_param);
//     const now = new Date();
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Execution started at: ${now.toISOString()}`);

//     const teamMember = await prisma.team_member.findUnique({ where: { emp_code: emp_code } });
//     if (!teamMember) {
//         console.error(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Team member not found.`);
//         throw new Error(`Team member with emp_code ${emp_code} not found.`);
//     }
//     const teamMemberId = teamMember.id;
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Found Team Member ID ${teamMemberId}.`);

//     const apiToken = await getAuthToken(); // Fetch token for external API

//     const todayForProcessing = new Date();
//     const startOfToday = startOfDay(todayForProcessing);
//     const endOfToday = endOfDay(todayForProcessing);
//     const attendanceDate = startOfToday;

//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Processing for date (startOfToday): ${startOfToday.toISOString()}`);

//     let transactionsForEmployee = [];
//     let currentPageUrl = `${API_BASE_URL}/iclock/api/transactions/?emp_code=${emp_code}&date=${format(todayForProcessing, 'yyyy-MM-dd')}`;
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching API transactions for date: ${format(todayForProcessing, 'yyyy-MM-dd')}`);

//     while (currentPageUrl) {
//         console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching from: ${currentPageUrl}`);
//         const response = await axios.get(currentPageUrl, {
//             headers: { "Content-Type": "application/json", "Authorization": `Token ${apiToken}` }
//         });
//         const pageData = response.data;
//         if (pageData && Array.isArray(pageData.data)) {
//             transactionsForEmployee = transactionsForEmployee.concat(pageData.data);
//             currentPageUrl = pageData.next;
//         } else {
//             console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Unexpected API page data structure or no 'data' array. Stopping pagination.`);
//             currentPageUrl = null;
//         }
//     }
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Total transactions fetched from API: ${transactionsForEmployee.length}`);

//     const employeeTransactionsToday = transactionsForEmployee.filter(tx => {
//         if (String(tx.emp_code) !== emp_code) {
//             console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - API Transaction with mismatched emp_code: ${tx.emp_code}`);
//             return false;
//         }
//         try {
//             const punchDateTime = parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date());
//             return punchDateTime >= startOfToday && punchDateTime <= endOfToday;
//         } catch (e) {
//             console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Could not parse punch_time: ${tx.punch_time}. Error: ${e.message}`);
//             return false;
//         }
//     });
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Transactions for today after validation: ${employeeTransactionsToday.length}`);

//     const CHECK_IN_DISPLAY = "Check In";
//     const CHECK_OUT_DISPLAY = "Check Out";

//     const checkIns = employeeTransactionsToday
//         .filter(tx => tx.punch_state_display === CHECK_IN_DISPLAY)
//         .map(tx => ({ ...tx, punch_time_obj: parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date()) }))
//         .sort((a, b) => a.punch_time_obj - b.punch_time_obj);

//     const checkOuts = employeeTransactionsToday
//         .filter(tx => tx.punch_state_display === CHECK_OUT_DISPLAY)
//         .map(tx => ({ ...tx, punch_time_obj: parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date()) }))
//         .sort((a, b) => b.punch_time_obj - a.punch_time_obj);

//     let firstCheckIn = checkIns.length > 0 ? checkIns[0] : null;
//     const standardStartTimeToday = setSeconds(setMinutes(setHours(startOfToday, 8), 30), 0);
//     let isLate = firstCheckIn ? isAfter(firstCheckIn.punch_time_obj, standardStartTimeToday) : null;

//     let lastCheckOutAfter530 = null;
//     const five30PMToday = setSeconds(setMinutes(setHours(startOfToday, 17), 30), 0);
//     for (const co of checkOuts) {
//         if (isAfter(co.punch_time_obj, five30PMToday)) {
//             lastCheckOutAfter530 = co;
//             break;
//         }
//     }
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - First CI: ${firstCheckIn ? firstCheckIn.punch_time : 'N/A'}, Last CO > 5:30: ${lastCheckOutAfter530 ? lastCheckOutAfter530.punch_time : 'N/A'}, Late: ${isLate}`);

//     const dailyAttendanceRecord = await prisma.dailyAttendance.upsert({
//         where: { teamMemberId_date: { teamMemberId: teamMemberId, date: attendanceDate } },
//         update: {
//             firstPunchTime: firstCheckIn ? firstCheckIn.punch_time_obj : null,
//             lastPunchAfter530Time: lastCheckOutAfter530 ? lastCheckOutAfter530.punch_time_obj : null,
//             isLate: typeof isLate === 'boolean' ? isLate : null
//         },
//         create: {
//             teamMemberId: teamMemberId,
//             date: attendanceDate,
//             firstPunchTime: firstCheckIn ? firstCheckIn.punch_time_obj : null,
//             lastPunchAfter530Time: lastCheckOutAfter530 ? lastCheckOutAfter530.punch_time_obj : null,
//             isLate: typeof isLate === 'boolean' ? isLate : null
//         },
//         select: { id: true, date: true, firstPunchTime: true, lastPunchAfter530Time: true, isLate: true, teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } } }
//     });
//     console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Daily attendance record upserted. ID: ${dailyAttendanceRecord.id}`);
//     return dailyAttendanceRecord;
// }

// // --- Exposed Express handler for processing daily attendance (e.g., if called by a cron or manually) ---
// exports.processAndSaveDailyAttendance = async (req, res) => {
//     try {
//         const emp_code_input = req.user.emp_code; // Assumes populated by auth middleware
//         if (!emp_code_input || emp_code_input === 'undefined') {
//             return res.status(400).json({ message: "Employee code not found in JWT token." });
//         }

//         const rawRecord = await _internalProcessAndSaveDailyAttendanceLogic(String(emp_code_input));

//         // Format the raw record for HTTP response
//         const formattedRecord = { ...rawRecord };
//         if (formattedRecord.date) { formattedRecord.date = format(formattedRecord.date, 'yyyy-MM-dd'); }
//         if (formattedRecord.firstPunchTime) { formattedRecord.firstPunchTime = format(formattedRecord.firstPunchTime, 'yyyy-MM-dd HH:mm:ss'); }
//         if (formattedRecord.lastPunchAfter530Time) { formattedRecord.lastPunchAfter530Time = format(formattedRecord.lastPunchAfter530Time, 'yyyy-MM-dd HH:mm:ss'); }
//         if (formattedRecord.isLate !== null) {
//             formattedRecord.isLate = formattedRecord.isLate ? "Yes" : "No";
//         } else {
//             formattedRecord.isLate = rawRecord.firstPunchTime ? "No" : "No check-in found"; // More accurate for null isLate
//         }

//         return res.status(200).json({
//             message: "Daily attendance processed and saved successfully via endpoint.",
//             data: formattedRecord
//         });
//     } catch (error) {
//         console.error("Error in HTTP processAndSaveDailyAttendance endpoint:", error.message, error.stack);
//         // Specific error handling based on error types or messages from the internal logic
//         if (error.isAxiosError) {
//             return res.status(error.response?.status || 500).json({ message: "API request failed during attendance processing.", details: error.response?.data });
//         }
//         if (error.message.includes("Team member with emp_code")) {
//             return res.status(404).json({ message: error.message });
//         }
//         if (error.message.includes("External API Authentication failed")) {
//             return res.status(503).json({ message: "Service unavailable: Could not authenticate with attendance API." });
//         }
//         return res.status(500).json({ message: error.message || "An internal server error occurred while processing attendance." });
//     }
// };


// exports.login = async (req, res) => {
//     const { email } = req.body;
//     try {
//         const teamMember = await prisma.team_member.findUnique({
//             where: { email },
//             // Select all fields needed for the token, response, and attendance processing
//             select: { id: true, email: true, emp_code: true, account_status: true, first_name: true, last_name: true /* add other necessary fields */ }
//         });

//         if (!teamMember) {
//             return res.status(404).json({ message: 'Team member not found' });
//         }
//         if (teamMember.account_status !== 'active') {
//             return res.status(403).json({ message: 'Account is inactive' });
//         }

//         // IMPORTANT: Ensure generateToken is a robust JWT generation function
//         const token = generateToken(teamMember);

//         let attendanceProcessingMessage = "Attendance processing initiated post-login.";
//         try {
//             if (teamMember.emp_code && String(teamMember.emp_code).trim() !== '' && teamMember.emp_code !== 'undefined') {
//                 console.log(`Login successful for ${email}. Triggering daily attendance processing for emp_code: ${teamMember.emp_code}`);
//                 await _internalProcessAndSaveDailyAttendanceLogic(teamMember.emp_code);
//                 console.log(`Daily attendance processing completed for emp_code: ${teamMember.emp_code} after login.`);
//                 attendanceProcessingMessage = "Login successful. Daily attendance has been processed.";
//             } else {
//                 console.warn(`emp_code not found or is invalid for team member ${email} (emp_code: '${teamMember.emp_code}'). Skipping attendance processing.`);
//                 attendanceProcessingMessage = "Login successful. Attendance processing skipped (employee code missing or invalid).";
//             }
//         } catch (attendanceError) {
//             console.error(`Error during post-login attendance processing for ${email} (emp_code: ${teamMember.emp_code}): ${attendanceError.message}`, attendanceError.stack);
//             attendanceProcessingMessage = `Login successful. However, attendance processing encountered an error: ${attendanceError.message.substring(0, 100)}...`; // Keep error brief for client
//         }

//         const { password, ...teamMemberWithoutPassword } = teamMember; // Ensure password is not in teamMember object if selected

//         return res.status(200).json({
//             message: attendanceProcessingMessage,
//             token,
//             teamMember: teamMemberWithoutPassword,
//         });

//     } catch (error) {
//         console.error('Error during login:', error, error.stack);
//         return res.status(500).json({ message: 'An error occurred during login', error: error.message });
//     }
// };

// // --- Monthly Attendance Report Function (remains unchanged) ---
// exports.getMonthlyAttendanceReport = async (req, res) => {
//     try {
//         const emp_code_input = req.user.emp_code;
//         const page = parseInt(req.query.page, 10) || 1;
//         const pageSize = parseInt(req.query.page_size, 10) || 10;

//         if (!emp_code_input || emp_code_input === 'undefined') {
//             return res.status(400).json({ message: "Employee code is required for the report." });
//         }
//         const emp_code = String(emp_code_input);

//         const teamMember = await prisma.team_member.findUnique({
//             where: { emp_code: emp_code },
//             select: { id: true, first_name: true, last_name: true, emp_code: true }
//         });

//         if (!teamMember) {
//             return res.status(404).json({ message: `Team member with emp_code ${emp_code} not found.` });
//         }
//         const teamMemberId = teamMember.id;
//         console.log(`Generating report for Team Member ID ${teamMemberId} (emp_code: ${emp_code}).`);

//         const today = new Date();
//         const firstDayOfMonth = startOfMonth(today);
//         const lastDayOfMonth = endOfMonth(today);
//         console.log(`Workspaceing report for month: ${format(firstDayOfMonth, 'yyyy-MM')}`);

//         const skip = (page - 1) * pageSize;
//         if (skip < 0) {
//             return res.status(400).json({ message: "Page number must be 1 or greater." });
//         }

//         const [attendanceRecords, totalRecords] = await prisma.$transaction([
//             prisma.dailyAttendance.findMany({
//                 where: { teamMemberId: teamMemberId, date: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
//                 orderBy: { date: 'asc' },
//                 skip: skip,
//                 take: pageSize,
//                 include: { teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } } }
//             }),
//             prisma.dailyAttendance.count({
//                 where: { teamMemberId: teamMemberId, date: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
//             })
//         ]);
//         console.log(`Found ${attendanceRecords.length} attendance records for the month (Total: ${totalRecords}).`);

//         const totalPages = Math.ceil(totalRecords / pageSize);
//         const formattedRecords = attendanceRecords.map(record => ({
//             ...record,
//             date: format(record.date, 'yyyy-MM-dd'),
//             firstPunchTime: record.firstPunchTime ? format(record.firstPunchTime, 'yyyy-MM-dd HH:mm:ss') : null,
//             lastPunchAfter530Time: record.lastPunchAfter530Time ? format(record.lastPunchAfter530Time, 'yyyy-MM-dd HH:mm:ss') : null,
//             isLate: record.isLate !== null ? (record.isLate ? "Yes" : "No") : (record.firstPunchTime ? "No" : "No check-in found"),
//         }));

//         res.status(200).json({
//             message: `Monthly attendance report for ${teamMember.first_name} ${teamMember.last_name} (emp_code: ${teamMember.emp_code})`,
//             month: format(today, 'yyyy-MM'),
//             employee: { id: teamMember.id, first_name: teamMember.first_name, last_name: teamMember.last_name, emp_code: teamMember.emp_code },
//             pagination: { totalRecords: totalRecords, currentPage: page, pageSize: pageSize, totalPages: totalPages },
//             data: formattedRecords
//         });

//     } catch (error) {
//         console.error("Error in getMonthlyAttendanceReport:", error.message, error.stack);
//         res.status(500).json({ message: error.message || "An internal server error occurred while generating the report." });
//     }
// };

// // --- Dummy JWT Generation Function (Replace with your actual implementation) ---
// // const jwt = require('jsonwebtoken'); // You would typically use a library like jsonwebtoken
// function generateToken(teamMember) {
//     console.warn("DEVELOPMENT: Using dummy generateToken. Replace with actual JWT generation logic using a strong secret key and appropriate claims (e.g., emp_code, user_id).");
//     // Example with actual JWT (ensure 'jsonwebtoken' is installed and YOUR_SECRET_KEY is secure):
//     // return jwt.sign({ id: teamMember.id, emp_code: teamMember.emp_code, email: teamMember.email }, 'YOUR_VERY_SECRET_KEY_THAT_IS_LONG_AND_COMPLEX', { expiresIn: '1h' });
//     return `dummy-jwt-token-for-${teamMember.email}-${Date.now()}`;
// }