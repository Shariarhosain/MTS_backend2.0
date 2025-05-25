// controllers/teamMemberController.js
const { PrismaClient } = require('@prisma/client');
const generateToken = require('../config/generateToken');  // Adjust path to your token generator

const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const { de } = require('@faker-js/faker');
const axios = require('axios');
const {
    format,
    isAfter,
    setHours,
    setMinutes,
    setSeconds,
    startOfDay,
    endOfDay,
    parse,
    startOfMonth,
    endOfMonth
} = require('date-fns');

// Configuration
const API_HOST = "192.168.10.252";
const API_PORT = "8088";
const API_USERNAME = "admin";
const API_PASSWORD = "Admin@123";
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;




// // Create a new team member
// exports.createTeamMember = async (req, res) => {


//     const { first_name, last_name, email, number, permanent_address, present_address, gender, blood_group, relationship, guardian_relation, guardian_number, guardian_address, religion, education } = req.body;
    
//     try {
//            console.log("📦 Fields:", req.body); // All form fields
//         console.log("🖼️ Files:", req.files); // All files    

//  // Access the first file in the array path
//         const file = req.files.dp[0].path; // Assuming 'dp' is the field name for the image upload
//         console.log("🖼️ File Path:", file); // Log the file path

//         // Create team member in database
//         const teamMember = await prisma.team_member.create({
//             data: {
//                 first_name,
//                 last_name,
//                 email,
//                 number,
//                 permanent_address,
//                 present_address,
//                 gender,
//                 blood_group,
//                 relationship,
//                 guardian_relation,
//                 guardian_number,
//                 guardian_address,
//                 religion,
//                 education,
//                 dp: file,  // Store the image path
//                 role: 'null', // Default role, can be updated later
//                 target:0,
//                 rewards: 0,
//                 rating: 0,
//                 account_status: 'active', // Default account status
              
//             }
//         });

//         console.log('Team member created:', teamMember);
//         return res.status(201).json({ message: 'Team member created successfully' });
//     } catch (error) {
//         console.error('Error during team member creation:', error);
//         return res.status(500).json({ message: 'An error occurred', error: error.message });
//     }
// };


// Create a new team member and generate a JWT token
exports.createTeamMember = async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        number,
        permanent_address,
        present_address,
        gender,
        blood_group,
        relationship,
        guardian_relation,
        guardian_number,
        guardian_address,
        religion,
        education,
        department: departmentName, // Rename the request body parameter
    } = req.body;

    try {

        console.log("📦 Fields:", req.body); // All form fields
        console.log("🖼️ Files:", req.files); // All files

        // Access the first file in the array path
        const file = req.files.dp[0].path; // Assuming 'dp' is the field name for the image upload
        console.log("🖼️ File Path:", file); // Log the file path


        //find department_name
        const department = await prisma.department.findUnique({
            where: { department_name: departmentName }, // Use the renamed variable
        });
        if (!department) {
            return res.status(404).json({
                message: 'Department not found',
            });
        }

        // Create team member in database
     const teamMember = await prisma.team_member.create({
            data: {
                first_name,
                last_name,
                email,
                number,
                permanent_address,
                present_address,
                gender,
                blood_group,
                relationship,
                guardian_relation,
                guardian_number,
                guardian_address,
                religion,
                education,
                department: {
                    connect: {
                        id: department.id, // Connect to the found department using its ID
                    },
                },
                dp: file,   // Store the image path
                role: 'null', // Default role, can be updated later
                target: 0,
                rewards: 0,
                rating: 0,
                account_status: 'active', // Default account status
                uid: req.body.uid, // Assuming uid is passed in the request body
            }
        });

        console.log('Team member created:', teamMember);

        // Generate JWT Token
        const uid= req.body.uid; // Assuming uid is passed in the request body
        if (!uid) {
            return res.status(400).json({ message: 'UID is required to generate token.' });
        }
        console.log("UID:", uid); // Log the UID
        const token = generateToken(uid);
         // Send this token to the frontend for authentication
        console.log("Token:", token); // Log the generated token;

        // Send response with token
        return res.status(201).json({
            message: 'Team member created successfully',
            token: token  // Send JWT token to frontend
        });

    } catch (error) {
        console.error('Error during team member creation:', error);
        return res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

exports.getAllTeamMembers = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(200).json({
                message: 'No pagination data provided, returning empty result.',
                teamMembers: [],
                pagination: {
                    page: 1,
                    limit: 100,
                    total: 0,
                    totalPages: 0,
                }
            });
        }

        const { page = 1, limit = 100 } = req.body;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;
        const teamMembers = await prisma.team_member.findMany({
            include: {
              team: {
                include: {
                  department: true,
                },
              },
              project: true, // directly related
              profile: true, // directly related
              department: true, // directly related
            },
            skip,
            take: limitNumber,
          });
          

        const totalTeamMembers = await prisma.team_member.count();

        const teamMembersWithoutPassword = teamMembers.map(({ password, ...rest }) => rest);

        return res.status(200).json({
            message: 'All team members retrieved successfully',
            teamMembers: teamMembersWithoutPassword,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: totalTeamMembers,
                totalPages: Math.ceil(totalTeamMembers / limitNumber),
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred while retrieving team members', error: error.message });
    }
};

// Update a team member by ID
exports.updateTeamMember = async (req, res) => {
    const { id } = req.params;
    try {

        //find by id if not error
        const ID = await prisma.team_member.findUnique({
            where: { id: parseInt(id, 10) }
        });
        if (!ID) {
            return res.status(404).json({ error: 'Team member not found.' });
        }


            const updateData = { ...req.body };
            
        
            const updatedTeamMember = await prisma.team_member.update({
                where: { id: parseInt(id, 10) },
                data: updateData,
            });

            return res.status(200).json({ message: 'Team member updated successfully', teamMember: updatedTeamMember });
        
    } catch (error) {
        console.error('Error updating team member:', error);
        return res.status(500).json({ message: 'An error occurred while updating the team member', error: error.message });
    }
};


exports.getTeamMemberById = async (req, res) => {
    const { id } = req.params;
    try {
        const teamMember = await prisma.team_member.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
                team: true,
                project: true,
                profile: true,
                department: true,
            }
        });
        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        return res.status(200).json({ message: 'Team member retrieved successfully', teamMember });
    } catch (error) {
        console.error('Error retrieving team member:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving the team member', error: error.message });
    }
}
// Deactivate a team member by ID (soft delete)
exports.deactivateTeamMember = async (req, res) => {
    const { id } = req.params;
    try {
        const teamMember = await prisma.team_member.findUnique({ where: { id: parseInt(id, 10) } });
        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // If the team member has a dp image, delete it
        if (teamMember.dp) {
            const dpPath = path.join(__dirname, '..', teamMember.dp);
            if (fs.existsSync(dpPath)) {
                fs.unlinkSync(dpPath);
            }
        }

        await prisma.team_member.update({
            where: { id: parseInt(id, 10) },
            data: { account_status: 'inactive' },
        });

        return res.status(200).json({ message: 'Team member deactivated and image deleted successfully' });
    } catch (error) {
        console.error('Error deactivating team member:', error);
        return res.status(500).json({ message: 'An error occurred while deactivating the team member', error: error.message });
    }
};






async function getAuthToken() {
    try {
        const response = await axios.post(`${API_BASE_URL}/api-token-auth/`, {
            username: API_USERNAME,
            password: API_PASSWORD
        }, {
            headers: { "Content-Type": "application/json" }
        });
        return response.data.token;
    } catch (error) {
        console.error("Error getting external API auth token:", error.response ? error.response.data : error.message);
        throw new Error("External API Authentication failed"); // Propagate error
    }
}


async function _internalProcessAndSaveDailyAttendanceLogic(emp_code_param) {
    // Ensure emp_code is a string and trimmed
    const emp_code = String(emp_code_param || '').trim();
    if (emp_code === '' || emp_code === 'undefined') {
        throw new Error("Invalid or empty employee code provided.");
    }

    const now = new Date(); // Use a consistent 'now' for the start of the process
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Execution started (First Punch Only) at: ${now.toISOString()}`);

    const teamMember = await prisma.team_member.findUnique({ where: { emp_code: emp_code } });
    if (!teamMember) {
        console.error(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Team member not found.`);
        throw new Error(`Team member with emp_code ${emp_code} not found.`);
    }
    const teamMemberId = teamMember.id;
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Found Team Member ID ${teamMemberId}.`);

    const apiToken = await getAuthToken(); // Fetch token for external API

    // --- CRITICAL FIX FOR ATTENDANCE DATE (STORING IN UTC AS EXPECTED BY DATABASE) ---
    // Get the current date components in LOCAL time (e.g., 20, 5, 2025)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const day = today.getDate();

    // Construct a Date object that represents the start of TODAY in UTC.
    // Example: For May 20, 2025 (local), this will create May 20, 2025 00:00:00 UTC.
    const attendanceDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    const startOfToday = attendanceDate; // This now represents 2025-05-20 00:00:00.000 UTC
    const endOfToday = new Date(startOfToday); // Clone to set end of today (UTC)
    endOfToday.setUTCHours(23, 59, 59, 999); // Set to 23:59:59.999 UTC

    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Calculated attendanceDate (UTC for DB): ${attendanceDate.toISOString()}`); // This should now show 2025-05-20T00:00:00.000Z
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Local Date representation for comparison: ${attendanceDate.toDateString()} (This is how it looks in your local time when displayed)`);


    let transactionsForEmployee = [];
    // The external API URL uses 'yyyy-MM-dd' format for the date.
    // We format the UTC 'attendanceDate' to ensure the correct day is queried.
    // format() uses local time zone by default for formatting.
    let currentPageUrl = `${API_BASE_URL}/iclock/api/transactions/?emp_code=${emp_code}&date=${format(attendanceDate, 'yyyy-MM-dd')}`;
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching API transactions for date: ${format(attendanceDate, 'yyyy-MM-dd')}`);

    // Fetch transactions with pagination
    try {
        while (currentPageUrl) {
            console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching from: ${currentPageUrl}`);
            const response = await axios.get(currentPageUrl, {
                headers: { "Content-Type": "application/json", "Authorization": `Token ${apiToken}` }
            });
            const pageData = response.data;

            if (pageData && Array.isArray(pageData.data)) {
                transactionsForEmployee = transactionsForEmployee.concat(pageData.data);
                currentPageUrl = pageData.next;
            } else {
                console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Unexpected API page data structure or missing 'data' array. Stopping pagination. Response data sample: ${JSON.stringify(pageData).substring(0, 200)}...`);
                currentPageUrl = null;
            }
        }
    } catch (apiError) {
        console.error(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Error fetching transactions from API:`, apiError.response ? apiError.response.data : apiError.message);
        throw new Error(`Failed to fetch attendance data from external API: ${apiError.message}`);
    }

    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Total transactions fetched from API: ${transactionsForEmployee.length}`);

    // Filter transactions to ensure they belong to the employee and are within today's date range.
    const employeeTransactionsToday = transactionsForEmployee
        .filter(tx => {
            try {
                // Parse the string 'punch_time' to a Date object. Assume punch_time is local for now.
                const punchDateTime = parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date());

                // For accurate comparison, convert punchDateTime to UTC for comparison with startOfToday/endOfToday (which are now UTC).
                // Or, ensure startOfToday/endOfToday are also in local time for comparison.
                // Let's stick with comparing local date time to local date time range.
                // We will use the 'attendanceDate' for the DB and API, which is a UTC start of day.
                // The filters need to align with the actual data being fetched.
                // Since API is queried for 'YYYY-MM-DD' (local date), filter based on local date range.
                const localPunchDate = new Date(punchDateTime.getFullYear(), punchDateTime.getMonth(), punchDateTime.getDate());
                const localAttendanceDate = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate());

                return String(tx.emp_code) === emp_code &&
                       localPunchDate.getTime() === localAttendanceDate.getTime(); // Compare just the date part (local)
            } catch (e) {
                console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Could not parse punch_time: ${tx.punch_time}. Ignoring transaction. Error: ${e.message}`);
                return false;
            }
        });

    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Valid transactions for today after filtering: ${employeeTransactionsToday.length}`);

    const CHECK_IN_DISPLAY = "Check In";

    // Find the first check-in. Sort directly using the 'punch_time' string as it's in a sortable format.
    const firstCheckInTransaction = employeeTransactionsToday
        .filter(tx => tx.punch_state_display === CHECK_IN_DISPLAY)
        .sort((a, b) => a.punch_time.localeCompare(b.punch_time))[0] || null;

    // 'firstPunchTimeValueForDb' will be the string to save to the database.
    let firstPunchTimeValueForDb = null;
    // 'firstPunchTimeParsedForCalc' will be the Date object used for lateness calculation.
    let firstPunchTimeParsedForCalc = null;

    if (firstCheckInTransaction) {
        firstPunchTimeValueForDb = firstCheckInTransaction.punch_time; // Keep as string for DB field
        // Parse to Date object for any time-based comparisons/calculations
        firstPunchTimeParsedForCalc = parse(firstCheckInTransaction.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date());
    }

    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - First CI found (raw string): ${firstPunchTimeValueForDb || 'N/A'}`);
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - First CI found (parsed for calc): ${firstPunchTimeParsedForCalc ? format(firstPunchTimeParsedForCalc, 'HH:mm:ss') : 'N/A'}`);

    // --- Calculate isLate ---
    let isLate = false;
    if (firstPunchTimeParsedForCalc) {
        const expectedStartTimeHour = 9;
        const expectedStartTimeMinute = 0;

        // Create a Date object representing the expected start time for the *same date* as the first punch, in its local timezone.
        const expectedStartTimeForPunchDate = new Date(firstPunchTimeParsedForCalc);
        expectedStartTimeForPunchDate.setHours(expectedStartTimeHour, expectedStartTimeMinute, 0, 0);

        if (firstPunchTimeParsedForCalc > expectedStartTimeForPunchDate) {
            isLate = true;
            console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Employee is LATE. First punch: ${format(firstPunchTimeParsedForCalc, 'HH:mm:ss')} vs Expected: ${format(expectedStartTimeForPunchDate, 'HH:mm:ss')}`);
        } else {
            console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Employee is ON TIME. First punch: ${format(firstPunchTimeParsedForCalc, 'HH:mm:ss')} vs Expected: ${format(expectedStartTimeForPunchDate, 'HH:mm:ss')}`);
        }
    } else {
        console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - No first check-in found, 'isLate' cannot be determined and will be set to 'false'.`);
        isLate = false;
    }

    // --- LOGGING RIGHT BEFORE UPSERT ---
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - About to upsert with date: ${attendanceDate.toISOString()} (UTC) and formatted as: ${format(attendanceDate, 'yyyy-MM-dd')} (local)`);

    // Save/update the daily attendance record in the database
    const dailyAttendanceRecord = await prisma.dailyAttendance.upsert({
        where: { teamMemberId_date: { teamMemberId: teamMemberId, date: attendanceDate } }, // Use attendanceDate (start of current day UTC)
        update: {
            firstPunchTime: firstPunchTimeValueForDb, // Pass the string value as per your schema
            isLate: isLate,
        },
        create: {
            teamMemberId: teamMemberId,
            date: attendanceDate, // Store the start of the current day (UTC Date object)
            firstPunchTime: firstPunchTimeValueForDb, // Pass the string value as per your schema
            isLate: isLate,
        },
        select: {
            id: true,
            date: true,
            firstPunchTime: true,
            isLate: true,
            teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } }
        }
    });
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Daily attendance record upserted. ID: ${dailyAttendanceRecord.id}, IsLate: ${dailyAttendanceRecord.isLate}, First Punch (DB): ${dailyAttendanceRecord.firstPunchTime}`);
    return dailyAttendanceRecord;
}

exports.login = async (req, res) => {
    const { email } = req.body;
    try {
        const teamMember = await prisma.team_member.findUnique({
            where: { email }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        if (teamMember.account_status !== 'active') {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        // TODO: Add password verification here if login requires a password

        const token = generateToken(teamMember);

        // Prepare the response object *before* initiating the background task
        const { password, ...teamMemberWithoutPassword } = teamMember;

        // Send the successful login response immediately
        res.status(200).json({
            message: "Login successful. Initiating daily attendance processing in the background.", // Update message
            token,
            teamMember: { ...teamMember, password: undefined }, // Exclude password from response
        });

        // --- Initiate Daily Attendance Processing in the Background ---
        // Remove await so the function call doesn't block the response
        if (teamMember.emp_code && String(teamMember.emp_code).trim() !== '' && String(teamMember.emp_code) !== 'undefined') {
            console.log(`Login successful for ${email}. Triggering daily attendance processing for emp_code: ${teamMember.emp_code} in background.`);
            // Call the async function without waiting for it
            _internalProcessAndSaveDailyAttendanceLogic(String(teamMember.emp_code))
                .then(() => {
                    console.log(`Background daily attendance processing completed for emp_code: ${teamMember.emp_code} after login.`);
                    // Note: You cannot send another response to the client here (res is already sent)
                })
                .catch(attendanceError => {
                    // Log errors from the background process
                    console.error(`Error during background post-login attendance processing for ${email} (emp_code: ${teamMember.emp_code}): ${attendanceError.message}`, attendanceError.stack);
                });
        } else {
            console.warn(`emp_code not found or is invalid for team member ${email} (emp_code: '${teamMember.emp_code}'). Skipping background attendance processing.`);
        }

        // Note: Nothing should be returned or sent with 'res' after the first res.status(200).json(...)

    } catch (error) {
        console.error('Error during login:', error, error.stack);
        // If an error occurs *before* sending the initial response, send an error response
        // If an error occurs *after* sending the initial response (e.g., within the background task),
        // it will be caught by the .catch() handler on the promise, not this main catch block.
        if (!res.headersSent) { // Check if response has already been sent
             return res.status(500).json({ message: 'An error occurred during login', error: error.message });
        } else {
             console.error('Error after response sent:', error);
        }
    }
};


//         // Validate emp_code
//         if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
//             return res.status(400).json({ message: "Employee code is required for the report." });
//         }
//         const emp_code = String(emp_code_input);

//         // Find the team member by emp_code
//         const teamMember = await prisma.team_member.findUnique({
//             where: { emp_code: emp_code },
//             select: { id: true, first_name: true, last_name: true, emp_code: true }
//         });

//         // Check if team member exists
//         if (!teamMember) {
//             return res.status(404).json({ message: `Team member with emp_code ${emp_code} not found.` });
//         }
//         const teamMemberId = teamMember.id;
//         console.log(`Generating report for Team Member ID ${teamMemberId} (emp_code: ${emp_code}).`);

//         // Determine the date range for the current month
//         const today = new Date();
//         const firstDayOfMonth = startOfMonth(today);
//         const lastDayOfMonth = endOfMonth(today);
//         console.log(`Processing report for month: ${format(firstDayOfMonth, 'yyyy-MM')}`);

//         // Calculate skip value for pagination
//         const skip = (page - 1) * pageSize;

//         // Validate page number
//         if (skip < 0) {
//             return res.status(400).json({ message: "Page number must be 1 or greater." });
//         }

//         // Fetch attendance records and total count for the month in a single transaction
//         const [attendanceRecords, totalRecords] = await prisma.$transaction([
//             prisma.dailyAttendance.findMany({
//                 where: {
//                     teamMemberId: teamMemberId,
//                     date: { gte: firstDayOfMonth, lte: lastDayOfMonth }
//                 },
//                 orderBy: { date: 'asc' }, // Order by date ascending
//                 skip: skip, // Apply pagination skip
//                 take: pageSize, // Apply pagination limit
//                 include: {
//                     teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } }
//                 }
//             }),
//             prisma.dailyAttendance.count({
//                 where: { teamMemberId: teamMemberId, date: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
//             })
//         ]);
//         console.log(`Found ${attendanceRecords.length} attendance records for the month (Total: ${totalRecords}).`);

//         // Calculate total pages for pagination metadata
//         const totalPages = Math.ceil(totalRecords / pageSize);

//         // Format attendance records for the response
//         const formattedRecords = attendanceRecords.map(record => ({
//             ...record,
//             date: format(record.date, 'yyyy-MM-dd'), // Format date
//             firstPunchTime: record.firstPunchTime ? format(new Date(record.firstPunchTime), 'yyyy-MM-dd HH:mm:ss') : null, // Safely format string to Date
//             lastPunchAfter530Time: record.lastPunchAfter530Time ? format(new Date(record.lastPunchAfter530Time), 'yyyy-MM-dd HH:mm:ss') : null,
//             isLate: record.isLate !== null ? (record.isLate ? "Yes" : "No") : (record.firstPunchTime ? "No" : "No check-in found"),
//         }));

//         // Send the monthly report response
//         res.status(200).json({
//             message: `Monthly attendance report for ${teamMember.first_name} ${teamMember.last_name} (emp_code: ${teamMember.emp_code})`,
//             month: format(today, 'yyyy-MM'), // Indicate the month of the report
//             employee: { id: teamMember.id, first_name: teamMember.first_name, last_name: teamMember.last_name, emp_code: teamMember.emp_code },
//             pagination: { totalRecords: totalRecords, currentPage: page, pageSize: pageSize, totalPages: totalPages },
//             data: formattedRecords // Include the formatted attendance records
//         });

//     } catch (error) {
//         // Log errors during report generation
//         console.error("Error in getMonthlyAttendanceReport:", error.message, error.stack);
//         // Send a generic error response
//         res.status(500).json({ message: error.message || "An internal server error occurred while generating the report." });
//     }
// };




// exports.getMonthlyAttendanceReport = async (req, res) => {
//     try {
//         const emp_code_input = req.user.emp_code;
//         const page = parseInt(req.query.page, 10) || 1;
//         const pageSize = parseInt(req.query.page_size, 10) || 10;

//         if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
//             return res.status(400).json({ message: "Employee code is required for the report." });
//         }
//         const emp_code = String(emp_code_input);

//         const teamMember = await prisma.team_member.findUnique({
//             where: { emp_code },
//             select: { id: true, first_name: true, last_name: true, emp_code: true }
//         });

//         if (!teamMember) {
//             return res.status(404).json({ message: `Team member with emp_code ${emp_code} not found.` });
//         }

//         const teamMemberId = teamMember.id;
//         const today = new Date();
//         const firstDayOfMonth = startOfMonth(today);
//         const lastDayOfMonth = endOfMonth(today);
//         const skip = (page - 1) * pageSize;

//         if (skip < 0) {
//             return res.status(400).json({ message: "Page number must be 1 or greater." });
//         }

//         const [attendanceRecords, totalRecords] = await prisma.$transaction([
//             prisma.dailyAttendance.findMany({
//                 where: {
//                     teamMemberId,
//                     date: { gte: firstDayOfMonth, lte: lastDayOfMonth }
//                 },
//                 orderBy: { date: 'asc' },
//                 skip,
//                 take: pageSize,
//                 include: {
//                     teamMember: {
//                         select: { id: true, first_name: true, last_name: true, emp_code: true }
//                     }
//                 }
//             }),
//             prisma.dailyAttendance.count({
//                 where: {
//                     teamMemberId,
//                     date: { gte: firstDayOfMonth, lte: lastDayOfMonth }
//                 }
//             })
//         ]);

//         const totalPages = Math.ceil(totalRecords / pageSize);

//         const formattedRecords = attendanceRecords.map(record => ({
//             ...record,
//             date: format(record.date, 'yyyy-MM-dd'),
//             firstPunchTime: record.firstPunchTime || null, // 👈 keep string as-is
//             lastPunchAfter530Time: record.lastPunchAfter530Time || null, // 👈 keep string as-is
//             isLate: record.isLate !== null
//                 ? (record.isLate ? "Yes" : "No")
//                 : (record.firstPunchTime ? "No" : "No check-in found"),
//         }));

//         res.status(200).json({
//             message: `Monthly attendance report for ${teamMember.first_name} ${teamMember.last_name} (emp_code: ${teamMember.emp_code})`,
//             month: format(today, 'yyyy-MM'),
//             employee: {
//                 id: teamMember.id,
//                 first_name: teamMember.first_name,
//                 last_name: teamMember.last_name,
//                 emp_code: teamMember.emp_code
//             },
//             pagination: {
//                 totalRecords,
//                 currentPage: page,
//                 pageSize,
//                 totalPages
//             },
//             data: formattedRecords
//         });

//     } catch (error) {
//         console.error("Error in getMonthlyAttendanceReport:", error.message, error.stack);
//         res.status(500).json({ message: error.message || "An internal server error occurred while generating the report." });
//     }
// };


// Define the getMonthlyAttendanceReport function
exports.getMonthlyAttendanceReport = async (req, res) => {
    try {
        const emp_code_input = req.user.emp_code; // From authentication middleware
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.page_size, 10) || 10;

        // Validate employee code
        if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
            return res.status(400).json({ message: "Employee code is required for the report." });
        }
        const emp_code = String(emp_code_input);

        // Fetch team member details
        const teamMember = await prisma.team_member.findUnique({
            where: { emp_code },
            select: { id: true, first_name: true, last_name: true, emp_code: true }
        });

        if (!teamMember) {
            return res.status(404).json({ message: `Team member with emp_code ${emp_code} not found.` });
        }

        const teamMemberId = teamMember.id;

        // Calculate date range for the current month
        const today = new Date(); // Use current date for the report's context
        const firstDayOfMonth = startOfMonth(today);
        const lastDayOfMonth = endOfMonth(today);

        // Calculate skip for pagination
        const skip = (page - 1) * pageSize;

        if (skip < 0) { // page number is 0 or negative
            return res.status(400).json({ message: "Page number must be 1 or greater." });
        }

        // Fetch attendance records and total count in a transaction
        const [attendanceRecords, totalRecords] = await prisma.$transaction([
            prisma.dailyAttendance.findMany({
                where: {
                    teamMemberId,
                    date: {
                        gte: firstDayOfMonth, // Greater than or equal to the first day of the month
                        lte: lastDayOfMonth   // Less than or equal to the last day of the month
                    }
                },
                orderBy: {
                    date: 'asc' // Order records by date
                },
                skip,         // For pagination
                take: pageSize,     // For pagination
                include: {
                    teamMember: { // Include related team member information
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            emp_code: true
                        }
                    }
                }
            }),
            prisma.dailyAttendance.count({ // Count total matching records for pagination
                where: {
                    teamMemberId,
                    date: {
                        gte: firstDayOfMonth,
                        lte: lastDayOfMonth
                    }
                }
            })
        ]);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Format records for the response
        const formattedRecords = attendanceRecords.map(record => ({
            id: record.id,
            teamMemberId: record.teamMemberId,
            // teamMember: record.teamMember, // Already selected specific fields
            date: format(record.date, 'yyyy-MM-dd'), // Format date
            firstPunchTime: record.firstPunchTime || null, // Keep string as-is or null
            lastPunchAfter530Time: record.lastPunchAfter530Time || null, // Keep string as-is or null
            isLate: record.isLate !== null
                ? (record.isLate ? "Yes" : "No")
                : (record.firstPunchTime ? "No" : "No check-in found"), // Logic for isLate display
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            // Include team member details directly in each record if preferred,
            // or rely on the top-level 'employee' object.
            // For simplicity, we're not duplicating teamMember info per record here
            // as it's already in record.teamMember if included fully, or can be added.
            // The 'include' above already adds teamMember to each record.
        }));

        // Send the response
        res.status(200).json({
            message: `Monthly attendance report for ${teamMember.first_name} ${teamMember.last_name} (emp_code: ${teamMember.emp_code})`,
            month: format(today, 'yyyy-MM'), // Current month being reported
            employee: {
                id: teamMember.id,
                first_name: teamMember.first_name,
                last_name: teamMember.last_name,
                emp_code: teamMember.emp_code
            },
            pagination: {
                totalRecords,
                currentPage: page,
                pageSize,
                totalPages
            },
            data: formattedRecords
        });

    } catch (error) {
        console.error("Error in getMonthlyAttendanceReport:", error.message, error.stack);
        // Send a generic error message to the client
        res.status(500).json({
            message: error.message || "An internal server error occurred while generating the report."
        });
    }
};













// // --- Exposed Express handler for processing daily attendance (e.g., if called by a cron or manually) ---
// // This endpoint is typically protected by authentication middleware that populates req.user
// exports.processAndSaveDailyAttendance = async (req, res) => {
//     try {
//         // Get emp_code from the authenticated user's token/session
//         const emp_code_input = req.user.emp_code; // Assumes populated by auth middleware
//         if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
//             return res.status(400).json({ message: "Employee code not found or is invalid in JWT token." });
//         }

//         // Call the core internal logic to process and save attendance
//         const rawRecord = await _internalProcessAndSaveDailyAttendanceLogic(String(emp_code_input));

//         // Format the raw record for HTTP response to make it user-friendly
//         const formattedRecord = { ...rawRecord };
//         if (formattedRecord.date) { formattedRecord.date = format(formattedRecord.date, 'yyyy-MM-dd'); }
//         if (formattedRecord.firstPunchTime) { formattedRecord.firstPunchTime = format(formattedRecord.firstPunchTime, 'yyyy-MM-dd HH:mm:ss'); }
//         if (formattedRecord.lastPunchAfter530Time) { formattedRecord.lastPunchAfter530Time = format(formattedRecord.lastPunchAfter530Time, 'yyyy-MM-dd HH:mm:ss'); }
//         // Convert the boolean/null isLate status to a descriptive string
//         if (formattedRecord.isLate !== null) {
//             formattedRecord.isLate = formattedRecord.isLate ? "Yes" : "No";
//         } else {
//              // If isLate is null, it means no check-in was found for the day
//             formattedRecord.isLate = rawRecord.firstPunchTime ? "No" : "No check-in found"; // Refined message for null isLate
//         }

//         // Send the successful response with the formatted record
//         return res.status(200).json({
//             message: "Daily attendance processed and saved successfully via endpoint.",
//             data: formattedRecord
//         });
//     } catch (error) {
//         // Log the error details on the server
//         console.error("Error in HTTP processAndSaveDailyAttendance endpoint:", error.message, error.stack);

//         // Handle specific known errors from the internal logic
//         if (error.isAxiosError) {
//             // Handle errors from the external API request
//             return res.status(error.response?.status || 500).json({ message: "API request failed during attendance processing.", details: error.response?.data });
//         }
//         if (error.message.includes("Team member with emp_code")) {
//             // Handle case where team member is not found in your database
//             return res.status(404).json({ message: error.message });
//         }
//         if (error.message.includes("External API Authentication failed")) {
//             // Handle external API authentication failure
//             return res.status(503).json({ message: "Service unavailable: Could not authenticate with attendance API." });
//         }
//         // Handle any other unexpected errors
//         return res.status(500).json({ message: error.message || "An internal server error occurred while processing attendance." });
//     }
// };













exports.teamCreate = async (req, res) => {  

    const { team_name, department_id } = req.body;
    try {
        const team = await prisma.team.create({
            data: {
                team_name,
                department: {
                    connect: {
                        id: department_id,
                    },
                },
            },
        });
        return res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
        console.error('Error creating team:', error);
        return res.status(500).json({ message: 'An error occurred while creating the team', error: error.message });
    }

}


exports.updateTeam = async (req, res) => {
    const { id } = req.params;
    const { team_name, department_id } = req.body;
    try {
        const updatedTeam = await prisma.team.update({
            where: { id: parseInt(id, 10) },
            data: {
               ...team_name && { team_name },
                ...(department_id && {
                    department: {
                        connect: {
                            id: department_id,
                        },
                    },
                }),
            },
        });
        return res.status(200).json({ message: 'Team updated successfully', team: updatedTeam });
    } catch (error) {
        console.error('Error updating team:', error);
        return res.status(500).json({ message: 'An error occurred while updating the team', error: error.message });
    }
};

exports.deleteTeam = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTeam = await prisma.team.delete({
            where: { id: parseInt(id, 10) },
        });
        return res.status(200).json({ message: 'Team deleted successfully', team: deletedTeam });
    } catch (error) {
        console.error('Error deleting team:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the team', error: error.message });
    }
};




  exports.departmentCreate = async (req, res) => {
    const { department_name } = req.body;
    try {
        const department = await prisma.department.create({
            data: {
                department_name,
            },
        });
        return res.status(201).json({ message: 'Department created successfully', department });
    } catch (error) {
        console.error('Error creating department:', error);
        return res.status(500).json({ message: 'An error occurred while creating the department', error: error.message });
    }
};
exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { department_name } = req.body;
    try {
        const updatedDepartment = await prisma.department.update({
            where: { id: parseInt(id, 10) },
            data: {
                department_name,
            },
        });
        return res.status(200).json({ message: 'Department updated successfully', department: updatedDepartment });
    } catch (error) {
        console.error('Error updating department:', error);
        return res.status(500).json({ message: 'An error occurred while updating the department', error: error.message });
    }
};

exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedDepartment = await prisma.department.delete({
            where: { id: parseInt(id, 10) },
        });
        return res.status(200).json({ message: 'Department deleted successfully', department: deletedDepartment });
    } catch (error) {
        console.error('Error deleting department:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the department', error: error.message });
    }
};





















