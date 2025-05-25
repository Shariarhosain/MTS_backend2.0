const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Socket } = require("socket.io-client");
//const { selesView_recent_month } = require('./profileController'); // Import the sales view function
const emitSalesData = require("../middlewares/salesEmitter"); // Import the sales emitter function
const totalOrdersCardData = require("../middlewares/projectCardEmitter"); // Import the total order card emitter function
const emitProjectDistributionCurrentMonth = require("../middlewares/projectEmitter"); // Import the project emitter function
const getTeamName = require("../middlewares/TeamName"); // Import the team name emitter function
const getDepartmentName = require("../middlewares/TeamName"); // Import the department name emitter function
const verifyToken = require("../middlewares/jwt"); // Import the JWT verification middleware
const  {teamwiseDeliveryGraph} = require("../middlewares/teamwiseDeliveryGraph"); // Import the team member emitter function

// Create an instance of express app
const app = express();
const server = http.createServer(app); // assuming you are using express
const io = socketIo(server); // Create a new instance of Socket.IO

//curd operations for project table
exports.createProject = async (req, res, io) => {
  try {
    // Destructure the variables from the request body
    const {
      clientName,
      ops_status,
      sales_comments,
      opsleader_comments,
      sheet_link,
      deli_last_date,
      status,
      orderAmount,
      bonus,
      rating,
      ordered_by,
      department,
      project_requirements,
      profile,
      order_id,
     
    } = req.body;

    // Create orderId by using the current date and time

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensures time = 00:00:00
    // Create the project name by combining clientName and orderId
    const projectName = `${clientName}-${order_id}`;

    
    const departmentId = department ? parseInt(department) : null;

    //projectName and orderId are not allowed in the request body
    if (req.body.projectName) {
      return res
        .status(400)
        .json({
          error: "projectName  not is not allowed in the request body.",
        });
    }

    const profileId = profile ? parseInt(profile) : null;

  
    // after_fiverr_amount and after_fiverr_bonus calculted by using order_amount and bonus  20% of order_amount and bonus
    const order_amount = orderAmount ? parseFloat(orderAmount) : null;
    const after_fiverr_amount = order_amount ? order_amount * 0.8 : null;

    const after_Fiverr_bonus = bonus ? parseFloat(bonus) * 0.8 : null;
    const deliLastDate = req.body.deli_last_date
      ? new Date(req.body.deli_last_date)
      : null;

      const ordered = ordered_by ? parseInt(ordered_by) : null;
    // Create the project record in the database
    const project = await prisma.project.create({
      data: {
        order_id,
        date: today,
        project_name: projectName,
        ops_status: "nra",
        sales_comments,
        opsleader_comments,
        sheet_link,
        team_member: {
          connect: { id: ordered }, // Connect using the team member's ID
        },
        deli_last_date: deliLastDate,
        status: "nra",
        order_amount,
        after_fiverr_amount: after_fiverr_amount,
        bonus,
        after_Fiverr_bonus: after_Fiverr_bonus,
        rating,
        department: {
          connect: { id: departmentId },
        },
        project_requirements,
        profile: {
          connect: { id: profileId }, // Connect the profile by its ID
        },
      },
    });

    // Fetch all projects to emit the updated list
    const projects = await prisma.project.findFirst({
      where: { id: project.id },
      include: {
        department: true,
        team: true,
        team_member: {
          include: {
            profile: true,
          },
        },
      },
    });
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;

    const projectsWithClientNames = {
      ...projects, // Spread the existing properties of `projects`
      clientName: projects.project_name.split('-')[0], // Extract `clientName` from `project_name`
      date: formatDate(projects.date), // Format the `date`
      deli_last_date: formatDate(projects.deli_last_date), // Format the `deli_last_date`
    };
    
// Trigger the `selesView_recent_month` after the project is created
const pp=projectsWithClientNames;

console.log("fullProject",projectsWithClientNames);
    res.status(201).json({ message: 'Project created successfully.', project });
    
    io.emit('projectCreated', pp); // ✅ Send full project with department name
    console.log("projectCreated",pp);
    await emitProjectDistributionCurrentMonth(io); // <-- call the helper that only emits via socket
    await emitSalesData(io); // <-- call the helper that only emits via socket
    // Emit the total order card data
    await totalOrdersCardData(io); // Emit the total order card data

  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while creating the project." });
    console.error("Error creating project:", error);
  }
};

// Get all projects with pagination post method



// exports.getAllProjects = async (req, res,io) => {
//   try {

//     //show all projects with  recent month projects
//     //ops_status ="revision"  will be shown in the project list  from also old month
//     const currentDate = new Date();
//     const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
//     const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
//     endOfCurrentMonth.setHours(23, 59, 59, 999);


// //count how many days left to delivery date
// const daysLeft = (deli_last_date) => {
//   const today = new Date();
//   const deliveryDate = new Date(deli_last_date);
//   const timeDiff = deliveryDate - today;
//   const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
//   return daysLeft;
// };
// // Get all projects daysLeft include. day let assiending to
// const projects = await prisma.project.findMany({
//   where: {
//     OR: [
//       {
//         //assiding order date between start and end of current month
//         date: {
//           gte: startOfCurrentMonth,
//           lte: endOfCurrentMonth,
//         },
        
        
//       },
//       {
//         ops_status:{
//           in: ["revision", "in progress", "pending"],
//         }         
//       },
      
//       //  status: "revision" or "in progress"
//       {
//         status: {
//           in: ["revision","in progress","pending"],
//         },
//       }

    

//     ],

//   },
//   include: {
//     department: true,
//     team_member: {
//       include: {
//         profile: true,
//       },
//     },
//   },
// });



//     io.emit("allProjects"); // Emit all projects to the client
// await totalOrdersCardData(io); // Emit the total order card data
//     return res.status(200).json({
//       message: "Projects retrieved successfully.",
//       projects: projects.map((project) => ({
//         ...project,
//         daysLeft: daysLeft(project.deli_last_date), // Calculate days left for each project
//       })),
    
   
//     });

    

//   } catch (error) {
//     res
//       .status(500)
//       .json({ error: "An error occurred while fetching projects." });
//     console.error("Error fetching projects:", error);
//   }
// };




//right code .................

// exports.getAllProjects = async (req, res, io) => {
//   try {
//     const currentDate = new Date();
//     const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
//     const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
//     endOfCurrentMonth.setHours(23, 59, 59, 999);

//     // Updated daysLeft function to show overdue message
//     const daysLeft = (deli_last_date) => {
//       const today = new Date();
//       const deliveryDate = new Date(deli_last_date);
//       const timeDiff = deliveryDate - today;
//       const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

//       // If overdue, display it
//       if (daysLeft < 0) {
//         return `Overdue by ${Math.abs(daysLeft)} days`;
//       }

//       return `${daysLeft} days left`; // Otherwise, show remaining days
//     };

//     const projects = await prisma.project.findMany({
//       where: {
//         OR: [
//           {
//             date: {
//               gte: startOfCurrentMonth,
//               lte: endOfCurrentMonth,
//             },
//           },
//           {
//             delivery_date: {
//               gte: startOfCurrentMonth,
//               lte: endOfCurrentMonth,
//             },
//           },
//           {
//             status: {
//               in: ["revision", "realrevision"],
//             },
//           },
//         ],
//       },
//       include: {
//         profile: true,
//         department: true,
//         team:true,
//         team_member: {
//           include: {
//             profile: true,
//           },
//         },
//       },
//     });
    


//     // Sort projects by the delivery date (those with earlier dates first)
//     projects.sort((a, b) => {
//       const dateA = new Date(a.deli_last_date);
//       const dateB = new Date(b.deli_last_date);

//       // Sort by delivery date (earliest first)
//       return dateA - dateB; 
//     });
//     const formatDate = (date) =>
//       date ? new Date(date).toISOString().split("T")[0] : null;
    
  
//   console.log("projects", projects); // Debugging the fetched projects


 



//     //extract client name from project name
//     const projectsWithClientNames = projects.map((project) => {
//       const clientName = project.project_name.split("-")[0]; // Extract client name from project name
//       return {
//         ...project,
//         clientName, // Add client name to the project object
//       };
//     });
//   //deli_last_date without iso format
//   const projectsWithFormattedDates = projectsWithClientNames.map((project) => ({
//     ...project,
//     date: formatDate(project.date),
//     deli_last_date: formatDate(project.deli_last_date),
//   }));
 
//     return res.status(200).json({
//       message: "Projects retrieved successfully.",
//       projects: projectsWithFormattedDates.map((project) => ({
//         ...project,
//         daysLeft: daysLeft(project.deli_last_date), // Calculate and add daysLeft
//       })),
//     });

//   } catch (error) {
//     console.error("Error fetching projects:", error);
//     res.status(500).json({ error: "An error occurred while fetching projects." });
//   }
// };

//right code  end.................

exports.getAllProjects = async (req, res, io) => {
  try {
    // 1️⃣ Get authenticated user ID from middleware
    const uid = req.user.uid;
    console.log("✅ Decoded UID:", uid);

    // 2️⃣ Find team based on UID
    const teamMember = await prisma.team_member.findFirst({
      where: { uid },
      include: { team: true },
    });

    console.log("🔍 Team Member:", teamMember);

    if (!teamMember || !teamMember.team) {
      return res.status(404).json({ error: "Team not found for the user." });
    }

    const team = teamMember.team;

    // ✅ Dynamic role detection
    const isSalesTeam = teamMember.role?.startsWith("sales_");
    const isOpsTeam = teamMember.role?.startsWith("operation_");

    console.log("🔎 Team:", team.team_name);
    console.log("🧭 Role:", teamMember.role);
    console.log("🧭 Is Sales Team:", isSalesTeam);
    console.log("🧭 Is Operations Team:", isOpsTeam);

    // 3️⃣ Define Date Range for current month
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    // 4️⃣ Project filtering logic
    let projectFilter = {
      OR: [
        {
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth,
          },
        },
        {
          delivery_date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth,
          },
        },
        {
          status: {
            in: ["revision", "realrevision"],
          },
        },
      ],
    };

    if (!isSalesTeam) {
      // Only restrict to team if not part of sales
      projectFilter = {
        AND: [
          projectFilter,
          { team_id: team.id },
        ],
      };
    }

    console.log("🔍 Project Filter:", projectFilter);

    // 5️⃣ Fetch projects
    const projects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        profile: true,
        department: true,
        team: {
          include: {
            team_member: true,
          },
        },
        team_member: {
          include: {
            profile: true,
          },
        },
      },
    });

    console.log("🔍 Fetched Projects:", projects);

    // 6️⃣ Sort by delivery deadline
    projects.sort((a, b) => {
      const dateA = new Date(a.deli_last_date || 0);
      const dateB = new Date(b.deli_last_date || 0);
      return dateA - dateB;
    });

    // 7️⃣ Utilities
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;

    const daysLeft = (deli_last_date) => {
      if (!deli_last_date) return "No delivery date";
      const today = new Date();
      const deliveryDate = new Date(deli_last_date);
      const timeDiff = deliveryDate - today;
      const diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      return diffDays < 0 ? `Overdue by ${Math.abs(diffDays)} days` : `${diffDays} days left`;
    };

    // 8️⃣ Format data
    const formattedProjects = projects.map((project) => {
      const clientName = project.project_name?.split("-")[0]?.trim() || "Unknown";
      return {
        ...project,
        clientName,
        date: formatDate(project.date),
        deli_last_date: formatDate(project.deli_last_date),
        daysLeft: daysLeft(project.deli_last_date),
      };
    });

    // 9️⃣ Final Response
    return res.status(200).json({
      message: "Projects retrieved successfully.",
      isSalesTeam,
      isOpsTeam,
      projects: formattedProjects,
    });

  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return res.status(500).json({
      error: "An error occurred while fetching projects.",
    });
  }
};




//first unlink then delete the project
/*  department_id: null,
    ordered_by: null,
    profile_id: null,
    team_id: null, */

exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found." });
    }

    // 2. Check if project is delivered - do not delete if delivered
    if (existingProject.delivery_date) {
      return res.status(400).json({ error: "Cannot delete a delivered project." });
    }

    // 3. Delete dependent today_task records
    await prisma.today_task.deleteMany({
      where: { project_id: Number(id) },
    });

    // 4. Delete dependent member_distribution records
    await prisma.member_distribution.deleteMany({
      where: { project_id: Number(id) },
    });

    // 5. Unlink other foreign keys if necessary
    await prisma.project.update({
      where: { id: Number(id) },
      data: {
        department_id: null,
        ordered_by: null,
        profile_id: null,
        team_id: null,
      },
    });

    // 6. Delete the project itself
    await prisma.project.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({
      error: "An error occurred while deleting the project.",
    });
  }
};



exports.totalOrderCard = async (req, res) => {
  try{
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
        after_Fiverr_bonus: true
      }
    });
  
    return res.status(200).json({
      message: "Total orders amount retrieved successfully.",
      totalOrdersAmount,
    });
  
  }
  catch (error) {
    console.error("Error fetching total orders amount:", error);
    return res.status(500).json({
      error: "An error occurred while fetching total orders amount.",
    });
  }

} 





exports.getProjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(id) },
      include: {
        department: true,
        team: {
          include: {
            team_member: true,
          },
        },
        team_member: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;
    const formattedProject = {
      ...project,
       clientName: project.project_name?.split("-")[0]?.trim() || "Unknown",
      date: formatDate(project.date),
      deli_last_date: formatDate(project.deli_last_date),
    };

    return res.status(200).json({
      message: "Project retrieved successfully.",
      project: formattedProject,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the project." });
  }
};

exports.updateProject = async (req, res, io) => {



  const { id } = req.params;

  //find all details by using id

  console.log("Incoming update body:", req.body);

  try {
    // 1. Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found." });
    }

    // 2. Prevent updating projectName
    if (req.body.projectName) {
      return res.status(400).json({ error: "Updating projectName is not allowed." });
    }

    // 3. Handle delivered status
    if (req.body.status === "delivered") {
    
      const delivery_date = new Date(req.body.delivery_date);
      if (!existingProject.delivery_date) {
        req.body.delivery_date = delivery_date;
        existingProject.ops_status = "delivered";
        
    // --- Add Member Distribution Logic Triggered by "delivered" status ---
    // Trigger this logic *after* the project is updated, using the final project object
    let newDistributionsCount = 0;
        // Only proceed if the project is assigned to a team
        if (existingProject.team_id) {
            try {
                // Step 6: Fetch all team members of the project's team
                const allProjectTeamMembers = await prisma.team_member.findMany({
                    where: { team_id: existingProject.team_id }, // Use the updated existingProject.team_id
                    select: { id: true },
                });

                if (!allProjectTeamMembers || allProjectTeamMembers.length === 0) {
                    console.warn(`updateProject: No team members found for project's team_id: ${existingProject.team_id}. No new member_distribution records considered upon 'delivered' status.`);
                } else {
                    // Step 7: Identify which of these team members do NOT already have a member_distribution record for this project
                    const allProjectTeamMemberIds = allProjectTeamMembers.map(member => member.id);
                    const existingDistributions = await prisma.member_distribution.findMany({
                        where: {
                            project_id: existingProject.id, // Use the updated existingProject.id
                            team_member_id: {
                                in: allProjectTeamMemberIds,
                            },
                        },
                        select: {
                            team_member_id: true,
                        },
                    });

                    const existingMemberIdsWithDistribution = new Set(
                        existingDistributions.map(dist => dist.team_member_id)
                    );

                    const distributionCreatePromises = [];
                    allProjectTeamMemberIds.forEach(memberId => {
                        if (!existingMemberIdsWithDistribution.has(memberId)) {
                            // This member does not have a distribution record for this project yet. Create one.
                            distributionCreatePromises.push(
                                prisma.member_distribution.create({
                                    data: {
                                        team_member_id: memberId,
                                        project_id: existingProject.id,
                                        amount: 0, // Default amount as Decimal
                                    },
                                })
                            );
                        }
                    });

                    // Step 8: Execute new member_distribution inserts in a transaction, if any
                    if (distributionCreatePromises.length > 0) {
                        await prisma.$transaction(distributionCreatePromises);
                        newDistributionsCount = distributionCreatePromises.length;
                        console.log(`updateProject: ${newDistributionsCount} new member_distribution records created for project ${existingProject.id} upon 'delivered' status.`);
                    } else {
                        console.log(`updateProject: All relevant team members for project ${existingProject.id} already have member_distribution records, or no new members to add distribution for, upon 'delivered' status.`);
                    }
                }
            } catch (distErr) {
                 console.error('updateProject (distribution logic) →', distErr);
                 // Re-throw the error so the main catch block handles it
                 throw distErr;
            }
        } else {
             console.warn(`updateProject: Project ${existingProject.id} is marked 'delivered' but has no team_id. Skipping member_distribution processing.`);
        }


      } else {
        req.body.delivery_date = existingProject.delivery_date;
        
      }

      await prisma.project.update({
        where: { id: existingProject.id },
        data: { ops_status: existingProject.ops_status },
      });
    }

    // 4. Parse deli_last_date if needed
    if (req.body.deli_last_date) {
      const parsedDate = new Date(req.body.deli_last_date);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ error: "Invalid deli_last_date format." });
      }
      req.body.deli_last_date = parsedDate;
    }

    // 5. Calculate after_fiverr_amount if order_amount is present
    if (req.body.order_amount) {
      req.body.after_fiverr_amount = req.body.order_amount * 0.8;
    }

    // 6. Calculate after_Fiverr_bonus if bonus is present
    if (req.body.bonus) {
      req.body.after_Fiverr_bonus = req.body.bonus * 0.8;
    }

    // 7. If team_id present, set assigned date
    if (req.body.team_id) {
      const assignedDate = new Date();
      assignedDate.setHours(0, 0, 0, 0);
      req.body.Assigned_date = assignedDate;
    }

    const update_status =['revision', 'realrevision', 'submitted', 'delivered', 'completed'];

    if (req.body.deli_last_date || update_status.includes(req.body.status)) {
      // Save this change to DB
      await prisma.project.update({
        where: { id: Number(id) },
        data: {
          update_at: new Date(),
        },
      });
    }
    
    /*  order_page_link       String?
  conversion_page_link String?
  client_login_info_link String?
  client_login_info_username String?
  client_login_info_password String?
  user_login_info_link String?
  user_login_info_username String?
  user_login_info_password String?
  cpanel_link        String?
  cpanel_username    String?
  cpanel_password    String?
  branch               branch? */
// 8. Destructure relation IDs and other direct project fields
const {
  department_id,
  team_id,
  profile_id,
  ordered_by,
  order_page_link,
  conversion_page_link,
  client_login_info_link,
  client_login_info_username,
  client_login_info_password,
  user_login_info_link,
  user_login_info_username,
  user_login_info_password,
  cpanel_link,
  cpanel_username, // <--- Keep this destructured if you want to explicitly handle it
  cpanel_password,
  branch,
  ...filteredBody // This will now contain even fewer fields if you move some to be explicitly handled
} = req.body;

// 9. Update project
const project = await prisma.project.update({
  where: { id: Number(id) },
  data: {
    ...filteredBody, // This will cover any fields NOT explicitly listed below
    // Explicitly add any fields that were destructured but are direct properties
    // For example, if you want to update cpanel_username:
    cpanel_username: cpanel_username, // Add this line
    order_page_link: order_page_link, // Add this if you want to update it
    conversion_page_link: conversion_page_link, // Add this if you want to update it
    client_login_info_link: client_login_info_link,
    client_login_info_username: client_login_info_username,
    client_login_info_password: client_login_info_password,
    user_login_info_link: user_login_info_link,
    user_login_info_username: user_login_info_username,
    user_login_info_password: user_login_info_password,
    cpanel_link: cpanel_link,
    cpanel_password: cpanel_password,
    branch: branch,
    // ... continue for all other direct fields you want to potentially update
    department: department_id ? { connect: { id: Number(department_id) } } : undefined,
    team: team_id ? { connect: { id: Number(team_id) } } : undefined,
    profile: profile_id ? { connect: { id: Number(profile_id) } } : undefined,
    team_member: ordered_by ? { connect: { id: Number(ordered_by) } } : undefined,
  },
});


if (req.body.team_id) {
  const teamId = Number(req.body.team_id);
  await teamwiseDeliveryGraph(io);



  /* 1️⃣  look for the neutral (parent) row */
  const parentRow = await prisma.today_task.findFirst({
    where: { project_id: project.id, team_member_id: null },
  });

  /* 2️⃣  create it if missing, otherwise just update the team_id */
  if (!parentRow) {
    await prisma.today_task.create({
      data: {
        project_id:          project.id,
        client_name:         project.project_name.split('-')[0] || null,
        team_id:             teamId,
        team_member_id:      null,         // neutral / parent row
        expected_finish_time: null,
        ops_status:          null,
      },
    });
  } else if (parentRow.team_id !== teamId) {
    await prisma.today_task.update({
      where: { id: parentRow.id },
      data:  { team_id: teamId },
    });
  }

  /* 3️⃣  keep the FK on the project record in sync */
  await prisma.project.update({
    where: { id: project.id },
    data:  { team_id: teamId },
  });
}








// // 9.5. Update today_task entries per team member
// if (req.body.team_id) {
//   // Fetch team members from the new team
//   const teamMembers = await prisma.team_member.findMany({
//     where: { team_id: Number(req.body.team_id) },
//     select: { id: true },
//   });

//   // Create a new today_task entry per team member
//   for (const member of teamMembers) {
//     await prisma.today_task.create({
//       data: {
//         project: {
//           connect: { id: project.id },
//         },
//         client_name: project.project_name.split("-")[0],
//         expected_finish_time: req.body.expected_finish_time || null,
//         team: {
//           connect: { id: Number(req.body.team_id) },
//         },
//         team_member: {
//           connect: [{ id: member.id }],
//         },
//         ops_status: req.body.ops_status || "not started",
//       },
//     });
//   }
// }

    // 10. Format date fields
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;

    const updatedProject = {
      ...project,
      date: formatDate(project.date),
      deli_last_date: formatDate(project.deli_last_date),
      delivery_date: formatDate(project.delivery_date),
    };

    // 11. Emit update
    io.emit("projectUpdated", updatedProject);
    await emitSalesData(io);
    await totalOrdersCardData(io);

    res.status(200).json({ message: "Project updated successfully.", project });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "An error occurred while updating the project." });
  }
};







// exports.updateProject = async (req, res, io) => {
//   const { id } = req.params;
//   console.log("Incoming update body:", req.body);

//   try {
//     // 1. Check if project exists
//     const existingProject = await prisma.project.findUnique({
//       where: { id: Number(id) },
//     });

//     if (!existingProject) {
//       return res.status(404).json({ error: "Project not found." });
//     }

//     // 2. Prevent updating projectName
//     if (req.body.projectName) {
//       return res.status(400).json({ error: "Updating projectName is not allowed." });
//     }

//     // --- Existing logic for handling delivered status (setting ops_status/delivery_date before main update) ---
//     // Note: This block currently only updates ops_status *before* the main update.
//     // The member distribution logic will be triggered based on the *final* status after the main update.
//     // This existing block might be slightly redundant if the main update also sets status/ops_status.
//     // Let's keep it for now as per the original code structure, but be aware the distribution check is later.
//     if (req.body.status === "delivered") {
//        // This part seems slightly off - it updates ops_status directly but doesn't update the project with the delivery_date from req.body yet.
//        // The main update later handles applying req.body properties.
//        // We'll trigger distribution based on the *final* status from the project object returned by the main update.
//     }
//     // --- End existing logic ---


//     // 4. Parse deli_last_date if needed
//     if (req.body.deli_last_date) {
//       const parsedDate = new Date(req.body.deli_last_date);
//       if (isNaN(parsedDate)) {
//         return res.status(400).json({ error: "Invalid deli_last_date format." });
//       }
//       req.body.deli_last_date = parsedDate;
//     }

//     // 5. Calculate after_fiverr_amount if order_amount is present
//     if (req.body.order_amount !== undefined) { // Check explicitly for undefined to allow 0
//       req.body.after_fiverr_amount = parseFloat(req.body.order_amount) * 0.8;
//     }

//     // 6. Calculate after_Fiverr_bonus if bonus is present
//      if (req.body.bonus !== undefined) { // Check explicitly for undefined to allow 0
//       req.body.after_Fiverr_bonus = parseFloat(req.body.bonus) * 0.8;
//     }


//     // 7. If team_id present, set assigned date (only if it's a new assignment?)
//     // This logic might need refinement: should it only set Assigned_date the *first* time a team_id is assigned?
//     // Current code sets it every time team_id is in the body. Assuming current behavior is intended.
//     if (req.body.team_id !== undefined) {
//        // Ensure team_id is a number or null
//        const teamId = req.body.team_id === null ? null : Number(req.body.team_id);
//        if (req.body.team_id !== null && isNaN(teamId)) {
//            return res.status(400).json({ error: "Invalid team_id format." });
//        }
//        req.body.team_id = teamId; // Use the validated number/null

//        // Set assigned date only if a team is being assigned (not unassigned)
//        if (teamId !== null) {
//            const assignedDate = new Date();
//            assignedDate.setHours(0, 0, 0, 0);
//            req.body.Assigned_date = assignedDate;
//        } else {
//             // If team is being unassigned, potentially clear Assigned_date?
//             // Depending on desired behavior, you might set req.body.Assigned_date = null;
//             // For now, keeping existing behavior which only sets it when team_id is provided and not null.
//        }
//     }


//     // 8. Set update_at if relevant fields are changed
//     const update_status =['revision', 'realrevision', 'submitted', 'delivered', 'completed'];
//     const shouldSetUpdateAt = req.body.deli_last_date || (req.body.status && update_status.includes(req.body.status));

//     // 8.1 Prepare update data, including `update_at` if needed
//     const updateData = { ...req.body };
//     if (shouldSetUpdateAt) {
//        updateData.update_at = new Date();
//     }

//     // 8.2 Destructure relation IDs from the *original* req.body, not the potentially modified updateData
//     const {
//       department_id,
//       team_id, // team_id is handled separately for validation and Assigned_date
//       profile_id,
//       ordered_by,
//       status, // status is handled separately for update_at and distribution trigger
//       deli_last_date, // Already parsed and added to updateData if present
//       order_amount, // Calculated and added to updateData if present
//       bonus, // Calculated and added to updateData if present
//       delivery_date, // If delivered, delivery_date might be in req.body and handled by updateData
//       // remove any other fields already processed or added to updateData
//       ...filteredBody
//     } = req.body; // Destructure from original body

//     // Reconstruct filteredBody using updateData, excluding IDs that are handled via `connect`
//      const finalUpdateData = { ...updateData };
//      delete finalUpdateData.department_id;
//      delete finalUpdateData.team_id;
//      delete finalUpdateData.profile_id;
//      delete finalUpdateData.ordered_by;


//     // 9. Update project (main update)
//     const project = await prisma.project.update({
//       where: { id: Number(id) },
//       data: {
//         ...finalUpdateData, // Use the data including calculated/parsed fields and update_at
//         department: department_id !== undefined ? (department_id === null ? { disconnect: true } : { connect: { id: Number(department_id) } }) : undefined,
//         team: team_id !== undefined ? (team_id === null ? { disconnect: true } : { connect: { id: Number(team_id) } }) : undefined,
//         profile: profile_id !== undefined ? (profile_id === null ? { disconnect: true } : { connect: { id: Number(profile_id) } }) : undefined,
//         team_member: ordered_by !== undefined ? (ordered_by === null ? { disconnect: true } : { connect: { id: Number(ordered_by) } }) : undefined,
//          // Ensure status from req.body is included if present, potentially overriding what was set in filteredBody
//          ...(req.body.status !== undefined && { status: req.body.status }),
//          // Ensure delivery_date from req.body is included if present
//          ...(req.body.delivery_date !== undefined && { delivery_date: new Date(req.body.delivery_date) }),

//       },
//     });

//     // --- Add Member Distribution Logic Triggered by "delivered" status ---
//     // Trigger this logic *after* the project is updated, using the final project object
//     let newDistributionsCount = 0;
//     if (project.status === "delivered") { // Check the status on the *updated* project object
//         // Only proceed if the project is assigned to a team
//         if (project.team_id) {
//             try {
//                 // Step 6: Fetch all team members of the project's team
//                 const allProjectTeamMembers = await prisma.team_member.findMany({
//                     where: { team_id: project.team_id }, // Use the updated project.team_id
//                     select: { id: true },
//                 });

//                 if (!allProjectTeamMembers || allProjectTeamMembers.length === 0) {
//                     console.warn(`updateProject: No team members found for project's team_id: ${project.team_id}. No new member_distribution records considered upon 'delivered' status.`);
//                 } else {
//                     // Step 7: Identify which of these team members do NOT already have a member_distribution record for this project
//                     const allProjectTeamMemberIds = allProjectTeamMembers.map(member => member.id);
//                     const existingDistributions = await prisma.member_distribution.findMany({
//                         where: {
//                             project_id: project.id, // Use the updated project.id
//                             team_member_id: {
//                                 in: allProjectTeamMemberIds,
//                             },
//                         },
//                         select: {
//                             team_member_id: true,
//                         },
//                     });

//                     const existingMemberIdsWithDistribution = new Set(
//                         existingDistributions.map(dist => dist.team_member_id)
//                     );

//                     const distributionCreatePromises = [];
//                     allProjectTeamMemberIds.forEach(memberId => {
//                         if (!existingMemberIdsWithDistribution.has(memberId)) {
//                             // This member does not have a distribution record for this project yet. Create one.
//                             distributionCreatePromises.push(
//                                 prisma.member_distribution.create({
//                                     data: {
//                                         team_member_id: memberId,
//                                         project_id: project.id,
//                                         amount: 0, // Default amount as Decimal
//                                     },
//                                 })
//                             );
//                         }
//                     });

//                     // Step 8: Execute new member_distribution inserts in a transaction, if any
//                     if (distributionCreatePromises.length > 0) {
//                         await prisma.$transaction(distributionCreatePromises);
//                         newDistributionsCount = distributionCreatePromises.length;
//                         console.log(`updateProject: ${newDistributionsCount} new member_distribution records created for project ${project.id} upon 'delivered' status.`);
//                     } else {
//                         console.log(`updateProject: All relevant team members for project ${project.id} already have member_distribution records, or no new members to add distribution for, upon 'delivered' status.`);
//                     }
//                 }
//             } catch (distErr) {
//                  console.error('updateProject (distribution logic) →', distErr);
//                  // Re-throw the error so the main catch block handles it
//                  throw distErr;
//             }
//         } else {
//              console.warn(`updateProject: Project ${project.id} is marked 'delivered' but has no team_id. Skipping member_distribution processing.`);
//         }
//     }
//     // --- End of Member Distribution Logic Trigger ---


//     // --- Existing logic for today_task parent row (if team_id changed) ---
//     // This block is distinct from the member_distribution logic and handles
//     // the neutral/parent today_task row creation/update when a team is assigned.
//     // It should likely remain as is.
//     if (req.body.team_id !== undefined && project.team_id) { // Check against the potentially updated team_id
//       const teamId = project.team_id; // Use the team_id from the updated project
//       // Assuming teamwiseDeliveryGraph and emitSalesData/totalOrdersCardData are defined elsewhere
//       await teamwiseDeliveryGraph(io); // This might need to be called after project update but potentially before final response/emits

//       /* 1️⃣  look for the neutral (parent) row */
//       const parentRow = await prisma.today_task.findFirst({
//         where: { project_id: project.id, team_member_id: null },
//       });

//       /* 2️⃣  create it if missing, otherwise just update the team_id */
//       if (!parentRow) {
//         await prisma.today_task.create({
//           data: {
//             project_id: project.id,
//             client_name: project.project_name.split('-')[0] || null,
//             team_id: teamId,
//             team_member_id: null,     // neutral / parent row
//             expected_finish_time: null,
//             ops_status: null, // Or perhaps 'not started'? Depends on your flow.
//           },
//         });
//       } else if (parentRow.team_id !== teamId) {
//          // If parent row exists but team_id is different, update it
//          // Note: If you allow changing the team of an *already assigned* project,
//          // you might need to consider deleting existing team_member specific today_tasks
//          // before creating new ones for the new team members. This logic is complex
//          // and not currently in the provided code, so sticking to just updating the parent.
//         await prisma.today_task.update({
//           where: { id: parentRow.id },
//           data:  { team_id: teamId },
//         });
//       }

//       /* 3️⃣  keep the FK on the project record in sync */
//       // This step is redundant if the main project update already sets team_id correctly
//       // based on req.body.team_id. Let's remove it to avoid unnecessary DB write.
//       // await prisma.project.update({
//       //   where: { id: project.id },
//       //   data:  { team_id: teamId },
//       // });
//     }
//     // --- End existing today_task parent row logic ---


//     // 10. Format date fields for response
//     const formatDate = (date) =>
//       date ? new Date(date).toISOString().split("T")[0] : null;

//     // Re-fetch or use the updated project object to ensure all fields are formatted correctly
//     // (the 'project' object from the update call should be sufficient, but formatting is needed)
//     const formattedProject = {
//       ...project,
//       date: formatDate(project.date),
//       deli_last_date: formatDate(project.deli_last_date),
//       delivery_date: formatDate(project.delivery_date),
//       createdAt: project.createdAt, // Assuming these exist and you want them formatted
//       updatedAt: project.updatedAt,
//       Assigned_date: formatDate(project.Assigned_date), // Assuming Assigned_date might be on project
//     };


//     // 11. Emit update and other socket events
//     io.emit("projectUpdated", formattedProject); // Emit the formatted project
//     // Ensure these functions are defined elsewhere
//     await emitSalesData(io);
//     await totalOrdersCardData(io);


//     // 12. Respond
//     return res.status(200).json({
//       message: "Project updated successfully.",
//       project: formattedProject, // Respond with the formatted project
//        ...(project.status === "delivered" && project.team_id && { // Include distribution count if triggered
//             new_member_distribution_records_created: newDistributionsCount,
//         })
//     });

//   } catch (error) {
//     console.error("Error updating project:", error);
//     // Add specific P2002 check from assignProjectToTeam
//     if (error.code === 'P2002') { // Prisma unique constraint violation code
//         // This might happen during member_distribution creation
//         return res.status(409).json({ error: 'Conflict: A unique constraint violation occurred during project update or member distribution processing. This might happen if trying to create duplicate member_distribution entries and the DB constraint is active.'});
//     }
//     return res.status(500).json({ error: "An error occurred while updating the project." });
//   }
// };
exports.sendPaginatedProjectData = async (socket, page = 1, limit = 10) => {
  try {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const projects = await prisma.project.findMany({
      skip,
      take: limitNumber,
      include: {
        department: true, // Include department information
      },
    });

    const totalProjects = await prisma.project.count();

    // Emit paginated project data to the connected client
    socket.emit("projectData", {
      projects,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalProjects,
        totalPages: Math.ceil(totalProjects / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error sending paginated project data:", error);
  }
};

// exports.getClientSuggestionsFromProjects = async (req, res) => {
//   const query = req.query.query;

//   if (!query || query.trim().length < 1) {
//     return res.status(400).json({ error: 'Query parameter is required.' });
//   }

//   try {
//     const projects = await prisma.project.findMany({
//       where: {
//         project_name: {
//           startsWith: query, // Or use `contains` for more flexible search
//           mode: 'insensitive',
//         }
//       },
//     select: {
//         project_name: true,
//         order_id: true,
//         id: true,
//     },
//       take: 100
//     });

//     const clientNames = projects.map(project => {
//       const [clientName] = project.project_name.split('-');
//       return clientName;
//     });
// //clientname with id 
//     const uniqueClientNames = [...new Set(clientNames)].map((clientName, index) => {
//       return {
//         clientName,
//         order_id: projects[index].order_id, // Assuming projects[index] has the id
//         id: projects[index].id // Assuming projects[index] has the id
//       };
//     });

//     return res.status(200).json({ uniqueClientNames });

//   } catch (error) {
//     console.error('Error fetching client suggestions:', error);
//     return res.status(500).json({ error: 'An error occurred while fetching client suggestions.' });
//   }
// };

exports.new_revision = async (req, res) => {
  const { id: project_id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(project_id) },
      include: { team: true }, // ✅ include the related team
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.team) {
      return res
        .status(400)
        .json({ error: "This project has no team assigned." });
    }

    // Update the project status to "revision"
    const updatedProject = await prisma.project.update({
      where: { id: Number(project_id) },
      data: { status: "revision" },
    });


    res.status(200).json({
      message:
        "Project status updated to revision and revision record created successfully.",
      updatedProject
    });
  } catch (error) {
    console.error("Error updating project status to revision:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the project status." });
  }
};

exports.getRecentMonthProjects = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    endOfCurrentMonth.setHours(23, 59, 59, 999); // Set time to the end of the day (23:59:59.999) in local time
  } catch (error) {
    console.error("Error fetching recent month projects:", error);
    return res
      .status(500)
      .json({
        error: "An error occurred while fetching recent month projects.",
      });
  }
};

exports.projectDistribution = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    const projectCurrent = await prisma.project.findMany({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      select: {
        project_name: true,
        after_fiverr_amount: true,
        after_Fiverr_bonus: true,
      },
    });
    console.log("Current Projects:", projectCurrent);

    res
      .status(200)
      .json({
        message: "Project distribution data emitted successfully.",
        projectCurrent,
      }); // <-- send a response after emitting data
  } catch (err) {
    res
      .status(500)
      .json({
        error: "An error occurred while emitting project distribution data.",
      });
    console.error("[Socket] Failed to emit project distribution data:", err);
  }
};

exports.getProjectsByClientName = async (req, res) => {
  const clientName = req.query.clientName;

  if (!clientName) {
    return res.status(400).json({ error: "Client name is required" });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        project_name: {
          startsWith: clientName,
          mode: "insensitive",
        },
      },
      take: 100,
    });

    return res.json({ projects });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


//get all department names from department table
exports.getAllDepartmentNames = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: {
        department_name: true,
      },
    });

    console.log("Department Names:", departments); // Debugging the department names
  
    return res.status(200).json({message: "Department names retrieved successfully.", departments });
  } catch (error) {
    console.error("Error fetching department names:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  
  }
};





exports.showallStatusRevisionProjects = async (req, res) => {
  try {

    //search by team member id and find her team details whixh project have status revision

    //first seach whuch team he belong to

    const teamMember = await prisma.team_member.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return res.status(404).json({ error: "Team member not found" });
    }


    const projects = await prisma.project.findMany({
      where: {
        team_id: teamMember.team.id,
        status: {
          in: ["revision", "realrevision"],
        }
      },
    });
    //extract client name from project name
    const projectsWithClientNames = projects.map((project) => {
      const clientName = project.project_name.split("-")[0]; // Extract client name from project name
      return {
        ...project,
        clientName, // Add client name to the project object
      };
    });

    return res.status(200).json({ projects: projectsWithClientNames });
  } catch (err) {
    console.error("Error fetching status revision projects:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
    
};










// Helper to determine if a value is a valid number
const isNumeric = (value) => {
  return /^\d+$/.test(value); // Checks if string contains only digits
};

// --- Client Name Functions ---

exports.getClientSuggestionsFromProjects = async (req, res) => {
  const query = req.body.query; // Expecting 'query' in the request body

  if (!query || query.trim().length < 1) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        project_name: {
          startsWith: query, // Use startsWith for name suggestions
          mode: 'insensitive',
        }
      },
      select: {
        project_name: true,
        order_id: true, // **IMPORTANT: Include order_id here**
      },
      take: 100 // Limit results
    });

    const uniqueClientNames = [];
    const seenClientNames = new Set();

    projects.forEach(project => {
      // Assuming project_name is like "ClientName-ProjectDetails"
      const [clientNamePart] = project.project_name.split('-');
      if (clientNamePart && !seenClientNames.has(clientNamePart)) {
        uniqueClientNames.push({
          clientName: clientNamePart,
          order_id: project.order_id // Include the order_id for display
        });
        seenClientNames.add(clientNamePart);
      }
    });

    return res.status(200).json({ uniqueClientNames });

  } catch (error) {
    console.error('Error fetching client suggestions:', error);
    return res.status(500).json({ error: 'An error occurred while fetching client suggestions.' });
  }
};

// Alternative for controllers/projectController.js
exports.getProjectsByClientName = async (req, res) => {
  const clientName = req.query.clientName;

  if (!clientName || clientName.trim().length < 1) {
    return res.status(400).json({ error: "Client name is required" });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          {
            project_name: {
              startsWith: `${clientName}-`, // Matches "ClientName-..."
              mode: "insensitive",
            },
          },
          {
            project_name: {
              equals: clientName, // Matches exact "ClientName"
              mode: "insensitive",
            },
          },
        ],
      },
      take: 100,
    });

    return res.json({ projects });
  } catch (err) {
    console.error("Error fetching projects by client name:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Order ID Functions (No Changes) ---

exports.getOrderSuggestionsFromProjects = async (req, res) => {
  const query = req.body.query;
  console.log("Query for order ID suggestions:", query);

  if (!query || query.trim().length < 1) {
    return res.status(400).json({ error: 'Order ID query is required.' });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        order_id: {
          contains: query,
          mode: 'insensitive',
        }
      },
      select: {
        id: true,
        project_name: true,
        order_id: true,
      },
      take: 100
    });

    return res.status(200).json({ projects });
  } catch (error) {
    console.error('Error fetching order ID suggestions:', error);
    return res.status(500).json({ error: 'An error occurred while fetching order ID suggestions.' });
  }
};

exports.getProjectsByOrderId = async (req, res) => {
  const orderId = req.query.orderId;
  console.log("Order ID for fetching projects:", orderId);

  if (!orderId || orderId.trim().length < 1) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
  
    // add # to order id
    const formattedOrderId = orderId.startsWith("#") ? orderId : `#${orderId}`; 
 console.log("Formatted Order ID:", formattedOrderId);

    const projects = await prisma.project.findMany({
      where: {
        order_id: formattedOrderId,
      },
    });

    return res.json({ projects });
  } catch (err) {
    console.error("Error fetching projects by order ID:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Revision Update Function (No Changes) ---

exports.updateRevision = async (req, res) => {
  const projectId = req.params.id;
  const { revision_comments, delivery_date, metting_link, metting_date } = req.body;

  if (!projectId || !revision_comments || !delivery_date) {
    return res.status(400).json({ error: "Project ID, revision comments, and delivery date are required." });
  }

  try {
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        revision_comments,
        delivery_date: new Date(delivery_date),
        metting_link,
        metting_date: metting_date ? new Date(metting_date) : null,
      },
    });
    return res.status(200).json({ message: "Revision updated successfully!", project: updatedProject });
  } catch (error) {
    console.error("Error updating revision:", error);
    return res.status(500).json({ error: "Failed to update revision." });
  }
};