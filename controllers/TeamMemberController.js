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





// --- Helper function to get the auth token for the external API ---
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

// --- Core Internal Logic for Processing and Saving Daily Attendance ---
async function _internalProcessAndSaveDailyAttendanceLogic(emp_code_param) {
    const emp_code = String(emp_code_param);
    const now = new Date(); // Use a consistent 'now' for the start of the process
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Execution started at: ${now.toISOString()}`);

    const teamMember = await prisma.team_member.findUnique({ where: { emp_code: emp_code } });
    if (!teamMember) {
        console.error(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Team member not found.`);
        throw new Error(`Team member with emp_code ${emp_code} not found.`);
    }
    const teamMemberId = teamMember.id;
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Found Team Member ID ${teamMemberId}.`);

    const apiToken = await getAuthToken(); // Fetch token for external API

    // Determine the processing date - typically 'today' based on server time
    const todayForProcessing = new Date();
    const startOfToday = startOfDay(todayForProcessing);
    const endOfToday = endOfDay(todayForProcessing);
    const attendanceDate = new Date(); // Store date without time for uniqueness constraint

    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Processing for date (startOfToday): ${startOfToday.toISOString()}`);

    let transactionsForEmployee = [];
    // Note: The external API URL includes the date parameter formatted as 'yyyy-MM-dd'
    let currentPageUrl = `${API_BASE_URL}/iclock/api/transactions/?emp_code=${emp_code}&date=${format(todayForProcessing, 'yyyy-MM-dd')}`;
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching API transactions for date: ${format(todayForProcessing, 'yyyy-MM-dd')}`);


    // Fetch transactions with pagination
    while (currentPageUrl) {
        console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Fetching from: ${currentPageUrl}`);
        const response = await axios.get(currentPageUrl, {
            headers: { "Content-Type": "application/json", "Authorization": `Token ${apiToken}` }
        });
        const pageData = response.data;
        if (pageData && Array.isArray(pageData.data)) {
            transactionsForEmployee = transactionsForEmployee.concat(pageData.data);
            // Update currentPageUrl with the 'next' URL provided by the API for pagination
            currentPageUrl = pageData.next;
        } else {
             // If no 'data' array or unexpected structure, stop pagination
            console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Unexpected API page data structure or no 'data' array. Stopping pagination.`);
            currentPageUrl = null;
        }
    }
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Total transactions fetched from API: ${transactionsForEmployee.length}`);


    // Filter transactions to ensure they belong to the employee and are within today's date range
    const employeeTransactionsToday = transactionsForEmployee.filter(tx => {
        // Ensure the emp_code from the transaction matches the one we're processing
        if (String(tx.emp_code) !== emp_code) {
            console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - API Transaction with mismatched emp_code: ${tx.emp_code}`);
            return false; // Ignore transactions for other employees
        }
        try {
            // Parse the punch_time string into a Date object
            const punchDateTime = parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date());
            // Check if the punch time falls within the start and end of today
            return punchDateTime >= startOfToday && punchDateTime <= endOfToday;
        } catch (e) {
            console.warn(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Could not parse punch_time: ${tx.punch_time}. Error: ${e.message}`);
            return false; // Ignore transactions with unparseable times
        }
    });
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Transactions for today after validation: ${employeeTransactionsToday.length}`);


    // Define expected display states for punches
    const CHECK_IN_DISPLAY = "Check In";
    const CHECK_OUT_DISPLAY = "Check Out";

    // Separate check-ins and check-outs, parse times, and sort
    const checkIns = employeeTransactionsToday
        .filter(tx => tx.punch_state_display === CHECK_IN_DISPLAY)
        .map(tx => ({ ...tx, punch_time_obj: parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date()) }))
        .sort((a, b) => a.punch_time_obj.getTime() - b.punch_time_obj.getTime()); // Use getTime() for reliable date comparison

    const checkOuts = employeeTransactionsToday
        .filter(tx => tx.punch_state_display === CHECK_OUT_DISPLAY)
        .map(tx => ({ ...tx, punch_time_obj: parse(tx.punch_time, 'yyyy-MM-dd HH:mm:ss', new Date()) }))
        .sort((a, b) => b.punch_time_obj.getTime() - a.punch_time_obj.getTime()); // Sort descending for check-outs


    // Determine first check-in and if the employee was late
    let firstCheckIn = checkIns.length > 0 ? checkIns[0] : null;
    // Define the standard start time for today (e.g., 8:30 AM)
    const standardStartTimeToday = setSeconds(setMinutes(setHours(startOfToday, 8), 30), 0);
    // Check if the first check-in time is after the standard start time
    // isLate is null if there's no check-in
    let isLate = firstCheckIn ? isAfter(firstCheckIn.punch_time_obj, standardStartTimeToday) : null;


    // Determine the last check-out after 5:30 PM
    let lastCheckOutAfter530 = null;
    // Define the 5:30 PM time for today
    const five30PMToday = setSeconds(setMinutes(setHours(startOfToday, 17), 30), 0); // 17 is 5 PM
    // Iterate through check-outs (already sorted descending) to find the first one after 5:30 PM
    for (const co of checkOuts) {
        if (isAfter(co.punch_time_obj, five30PMToday)) {
            lastCheckOutAfter530 = co;
            break; // Found the latest check-out after 5:30, no need to check further
        }
    }
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - First CI: ${firstCheckIn ? format(firstCheckIn.punch_time_obj, 'HH:mm:ss') : 'N/A'}, Last CO > 5:30: ${lastCheckOutAfter530 ? format(lastCheckOutAfter530.punch_time_obj, 'HH:mm:ss') : 'N/A'}, Late: ${isLate}`);

    // Save/update the daily attendance record in the database
    const dailyAttendanceRecord = await prisma.dailyAttendance.upsert({
        where: { teamMemberId_date: { teamMemberId: teamMemberId, date: attendanceDate } }, // Use attendanceDate (start of day) for uniqueness
        update: {
            firstPunchTime: firstCheckIn ? firstCheckIn.punch_time_obj : null,
            lastPunchAfter530Time: lastCheckOutAfter530 ? lastCheckOutAfter530.punch_time_obj : null,
            isLate: typeof isLate === 'boolean' ? isLate : null // Store as boolean or null
        },
        create: {
            teamMemberId: teamMemberId,
            date: attendanceDate, // Store date without time
            firstPunchTime: firstCheckIn ? firstCheckIn.punch_time_obj : null,
            lastPunchAfter530Time: lastCheckOutAfter530 ? lastCheckOutAfter530.punch_time_obj : null,
            isLate: typeof isLate === 'boolean' ? isLate : null // Store as boolean or null
        },
        // Select necessary fields for the return value
        select: { id: true, date: true, firstPunchTime: true, lastPunchAfter530Time: true, isLate: true, teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } } }
    });
    console.log(`[INTERNAL_ATTENDANCE_LOGIC] emp_code: ${emp_code} - Daily attendance record upserted. ID: ${dailyAttendanceRecord.id}`);
    return dailyAttendanceRecord; // Return the saved/updated record
}

// --- Exposed Express handler for processing daily attendance (e.g., if called by a cron or manually) ---
// This endpoint is typically protected by authentication middleware that populates req.user
exports.processAndSaveDailyAttendance = async (req, res) => {
    try {
        // Get emp_code from the authenticated user's token/session
        const emp_code_input = req.user.emp_code; // Assumes populated by auth middleware
        if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
            return res.status(400).json({ message: "Employee code not found or is invalid in JWT token." });
        }

        // Call the core internal logic to process and save attendance
        const rawRecord = await _internalProcessAndSaveDailyAttendanceLogic(String(emp_code_input));

        // Format the raw record for HTTP response to make it user-friendly
        const formattedRecord = { ...rawRecord };
        if (formattedRecord.date) { formattedRecord.date = format(formattedRecord.date, 'yyyy-MM-dd'); }
        if (formattedRecord.firstPunchTime) { formattedRecord.firstPunchTime = format(formattedRecord.firstPunchTime, 'yyyy-MM-dd HH:mm:ss'); }
        if (formattedRecord.lastPunchAfter530Time) { formattedRecord.lastPunchAfter530Time = format(formattedRecord.lastPunchAfter530Time, 'yyyy-MM-dd HH:mm:ss'); }
        // Convert the boolean/null isLate status to a descriptive string
        if (formattedRecord.isLate !== null) {
            formattedRecord.isLate = formattedRecord.isLate ? "Yes" : "No";
        } else {
             // If isLate is null, it means no check-in was found for the day
            formattedRecord.isLate = rawRecord.firstPunchTime ? "No" : "No check-in found"; // Refined message for null isLate
        }

        // Send the successful response with the formatted record
        return res.status(200).json({
            message: "Daily attendance processed and saved successfully via endpoint.",
            data: formattedRecord
        });
    } catch (error) {
        // Log the error details on the server
        console.error("Error in HTTP processAndSaveDailyAttendance endpoint:", error.message, error.stack);

        // Handle specific known errors from the internal logic
        if (error.isAxiosError) {
            // Handle errors from the external API request
            return res.status(error.response?.status || 500).json({ message: "API request failed during attendance processing.", details: error.response?.data });
        }
        if (error.message.includes("Team member with emp_code")) {
            // Handle case where team member is not found in your database
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("External API Authentication failed")) {
            // Handle external API authentication failure
            return res.status(503).json({ message: "Service unavailable: Could not authenticate with attendance API." });
        }
        // Handle any other unexpected errors
        return res.status(500).json({ message: error.message || "An internal server error occurred while processing attendance." });
    }
};


// --- Exposed Express handler for user login ---
// This endpoint authenticates a user by email and triggers attendance processing if successful.
exports.login = async (req, res) => {
    const { email } = req.body;
    try {
        const teamMember = await prisma.team_member.findUnique({
            where: { email },
            select: { id: true, email: true, emp_code: true, account_status: true, uid: true, first_name: true, last_name: true /* add other necessary fields */ }
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
            teamMember: teamMemberWithoutPassword,
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
// --- Exposed Express handler for generating a monthly attendance report ---
// This endpoint is typically protected by authentication middleware that populates req.user
exports.getMonthlyAttendanceReport = async (req, res) => {
    try {
        // Get emp_code from the authenticated user's token/session
        const emp_code_input = req.user.emp_code;
        // Get pagination parameters from query string, default to page 1, size 10
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.page_size, 10) || 10;

        // Validate emp_code
        if (!emp_code_input || String(emp_code_input).trim() === '' || String(emp_code_input) === 'undefined') {
            return res.status(400).json({ message: "Employee code is required for the report." });
        }
        const emp_code = String(emp_code_input);

        // Find the team member by emp_code
        const teamMember = await prisma.team_member.findUnique({
            where: { emp_code: emp_code },
            select: { id: true, first_name: true, last_name: true, emp_code: true }
        });

        // Check if team member exists
        if (!teamMember) {
            return res.status(404).json({ message: `Team member with emp_code ${emp_code} not found.` });
        }
        const teamMemberId = teamMember.id;
        console.log(`Generating report for Team Member ID ${teamMemberId} (emp_code: ${emp_code}).`);

        // Determine the date range for the current month
        const today = new Date();
        const firstDayOfMonth = startOfMonth(today);
        const lastDayOfMonth = endOfMonth(today);
        console.log(`Processing report for month: ${format(firstDayOfMonth, 'yyyy-MM')}`);

        // Calculate skip value for pagination
        const skip = (page - 1) * pageSize;
         // Validate page number
        if (skip < 0) {
            return res.status(400).json({ message: "Page number must be 1 or greater." });
        }

        // Fetch attendance records and total count for the month in a single transaction
        const [attendanceRecords, totalRecords] = await prisma.$transaction([
            prisma.dailyAttendance.findMany({
                where: { teamMemberId: teamMemberId, date: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                orderBy: { date: 'asc' }, // Order by date ascending
                skip: skip, // Apply pagination skip
                take: pageSize, // Apply pagination limit
                include: { teamMember: { select: { id: true, first_name: true, last_name: true, emp_code: true } } } // Include team member info if needed
            }),
            prisma.dailyAttendance.count({
                where: { teamMemberId: teamMemberId, date: { gte: firstDayOfMonth, lte: lastDayOfMonth } } // Count total records for the same filter
            })
        ]);
        console.log(`Found ${attendanceRecords.length} attendance records for the month (Total: ${totalRecords}).`);

        // Calculate total pages for pagination metadata
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Format attendance records for the response
        const formattedRecords = attendanceRecords.map(record => ({
            ...record,
            date: format(record.date, 'yyyy-MM-dd'), // Format date
            firstPunchTime: record.firstPunchTime ? format(record.firstPunchTime, 'yyyy-MM-dd HH:mm:ss') : null, // Format punch times
            lastPunchAfter530Time: record.lastPunchAfter530Time ? format(record.lastPunchAfter530Time, 'yyyy-MM-dd HH:mm:ss') : null,
             // Convert isLate boolean/null to descriptive string
            isLate: record.isLate !== null ? (record.isLate ? "Yes" : "No") : (record.firstPunchTime ? "No" : "No check-in found"),
        }));

        // Send the monthly report response
        res.status(200).json({
            message: `Monthly attendance report for ${teamMember.first_name} ${teamMember.last_name} (emp_code: ${teamMember.emp_code})`,
            month: format(today, 'yyyy-MM'), // Indicate the month of the report
            employee: { id: teamMember.id, first_name: teamMember.first_name, last_name: teamMember.last_name, emp_code: teamMember.emp_code }, // Include employee details
            pagination: { totalRecords: totalRecords, currentPage: page, pageSize: pageSize, totalPages: totalPages }, // Include pagination metadata
            data: formattedRecords // Include the formatted attendance records
        });

    } catch (error) {
        // Log errors during report generation
        console.error("Error in getMonthlyAttendanceReport:", error.message, error.stack);
        // Send a generic error response
        res.status(500).json({ message: error.message || "An internal server error occurred while generating the report." });
    }
};





































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





















