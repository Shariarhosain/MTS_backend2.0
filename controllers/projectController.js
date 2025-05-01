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
      order_id
     
    } = req.body;

    // Create orderId by using the current date and time

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensures time = 00:00:00
    // Create the project name by combining clientName and orderId
    const projectName = `${clientName}-${order_id}`;

    //get profile id by using profile name
    const profileData = await prisma.profile.findUnique({
      where: { profile_name: profile },
    });
    console.log("profileData", profileData);



    //projectName and orderId are not allowed in the request body
    if (req.body.projectName) {
      return res
        .status(400)
        .json({
          error: "projectName  not is not allowed in the request body.",
        });
    }

    // Get departmentId from department name
    const departmentData = await prisma.department.findUnique({
      where: { department_name: department },
    });

    const departmentId = departmentData ? departmentData.id : null;

    if (!departmentId) {
      return res.status(400).json({ error: "Invalid department name." });
    }
    // after_fiverr_amount and after_fiverr_bonus calculted by using order_amount and bonus  20% of order_amount and bonus
    const order_amount = orderAmount ? parseFloat(orderAmount) : null;
    const after_fiverr_amount = order_amount ? order_amount * 0.8 : null;

    const after_Fiverr_bonus = bonus ? parseFloat(bonus) * 0.8 : null;
    const deliLastDate = req.body.deli_last_date
      ? new Date(req.body.deli_last_date)
      : null;

    // Create the project record in the database
    const project = await prisma.project.create({
      data: {
        order_id,
        date: today,
        project_name: projectName,
        ops_status,
        sales_comments,
        opsleader_comments,
        sheet_link,
        team_member: {
          connect: { id: ordered_by }, // Connect using the team member's ID
        },
        deli_last_date: deliLastDate,
        status,
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
          connect: { id: profileData.id }, // Connect the profile by its ID
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
exports.getAllProjects = async (req, res, io) => {
  try {
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    // Updated daysLeft function to show overdue message
    const daysLeft = (deli_last_date) => {
      const today = new Date();
      const deliveryDate = new Date(deli_last_date);
      const timeDiff = deliveryDate - today;
      const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

      // If overdue, display it
      if (daysLeft < 0) {
        return `Overdue by ${Math.abs(daysLeft)} days`;
      }

      return `${daysLeft} days left`; // Otherwise, show remaining days
    };

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          {
            date: {
              gte: startOfCurrentMonth,
              lte: endOfCurrentMonth,
            },
          },
          {
            status: {
              in: ["revision", "in progress", "pending"],
            },
          },
        ],
      },
      include: {
        department: true,
        team_member: {
          include: {
            profile: true,
          },
        },
      },
    });


    // Sort projects by the delivery date (those with earlier dates first)
    projects.sort((a, b) => {
      const dateA = new Date(a.deli_last_date);
      const dateB = new Date(b.deli_last_date);

      // Sort by delivery date (earliest first)
      return dateA - dateB; 
    });
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;
    
  
  console.log("projects", projects); // Debugging the fetched projects


 



    //extract client name from project name
    const projectsWithClientNames = projects.map((project) => {
      const clientName = project.project_name.split("-")[0]; // Extract client name from project name
      return {
        ...project,
        clientName, // Add client name to the project object
      };
    });
  //deli_last_date without iso format
  const projectsWithFormattedDates = projectsWithClientNames.map((project) => ({
    ...project,
    date: formatDate(project.date),
    deli_last_date: formatDate(project.deli_last_date),
  }));
 
    return res.status(200).json({
      message: "Projects retrieved successfully.",
      projects: projectsWithFormattedDates.map((project) => ({
        ...project,
        daysLeft: daysLeft(project.deli_last_date), // Calculate and add daysLeft
      })),
    });

  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "An error occurred while fetching projects." });
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

  try {
    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Prevent updating projectName
    if (req.body.projectName) {
      return res
        .status(400)
        .json({ error: "Updating projectName is not allowed." });
    }

    // Handle deli_last_date
    if (req.body.deli_last_date) {
      const parsedDate = new Date(req.body.deli_last_date);
      if (isNaN(parsedDate)) {
        return res
          .status(400)
          .json({ error: "Invalid deli_last_date format." });
      }
      req.body.deli_last_date = parsedDate;
    }

    // Handle department name → department_id conversion
    // if (req.body.department) {
    //   const departmentData = await prisma.department.findUnique({
    //     where: { department_name: req.body.department },
    //   });

    //   if (!departmentData) {
    //     return res.status(400).json({ error: "Invalid department name." });
    //   }

    //   // Replace department name with ID
    //   req.body.department_id = departmentData.id;
    //   delete req.body.department; // remove name to prevent Prisma error
    // }


    // if req.body.order_amount is present then calculate after_fiverr_amount
    if (req.body.order_amount) {
      const after_fiverr_amount = req.body.order_amount * 0.8;
      req.body.after_fiverr_amount = after_fiverr_amount;
    }

    //if req.body.bonus is present then calculate after_fiverr_bonus
    if (req.body.bonus) {
      const after_Fiverr_bonus = req.body.bonus * 0.8;
      req.body.after_Fiverr_bonus = after_Fiverr_bonus;
    }

    // if (req.body.team_name) {
    //   // Find the team ID based on the team name
    //   const teamData = await prisma.team.findUnique({
    //     where: { team_name: req.body.team_name },
    //   });
    //   if (!teamData) {
    //     return res.status(400).json({ error: "Invalid team name." });
    //   }
    //   req.body.team_id = teamData.id; // Set the team ID in the request body
    //   delete req.body.team_name; // Remove the team name to prevent Prisma error
    // }
    // Update the project
    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: req.body,
    });

console.log("req.body", req.body.team_id); // Debugging the updated project data
    console.log("project", project); // Debugging the updated project data


    //send project data date in the proper format like yyyy-mm-dd
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;
    const updatedProject = {
      ...project,
      date: formatDate(project.date),
      deli_last_date: formatDate(project.deli_last_date),
    };

    console.log("updatedProject", updatedProject); // Real-time update to front end
    io.emit("projectUpdated", updatedProject);
    await emitSalesData(io);
    await totalOrdersCardData(io); // Emit the total order card data
    res.status(200).json({ message: "Project updated successfully.", project });
  } catch (error) {
    console.error("Error updating project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the project." });
  }
};

// Function to send paginated project data to the connected client in real-time
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
//   const query = req.query.query; // Get the query from the request query string
//   console.log("Query:", query); // Debugging the query for testing

//   if (!query || query.trim().length < 1) {
//     return res.status(400).json({ error: 'Query parameter is required.' });
//   }

//   try {
//     // Fetch project names and filter by query
//     const projects = await prisma.project.findMany({
//       where: {
//         project_name: {
//           startsWith: query, // Assuming "clientName-orderId"
//           mode: 'insensitive',
//         },

//       },
//    take: 100
//     })

//     //console.log("Fetched Projects:", projects); // Debugging the raw fetched data

//     // Extract client names from project names (assuming format is "clientName-orderId")
//     const clientNames = projects.map(project => {
//       const [clientName] = project.project_name.split('-'); // Extract the client name before the hyphen
//       return clientName;
//     });

//     console.log("Client Names from Projects:", clientNames); // Debugging the client names extracted

//     // // Filter client names based on the query
//     // const filteredClientNames = clientNames.filter(clientName =>
//     //   clientName.toLowerCase().startsWith(query.toLowerCase()) // Check if client name starts with the query
//     // );

//     // console.log("Filtered Client Names:", filteredClientNames); // Debugging the filtered client names

//     // Remove duplicates by converting to a Set
//     const uniqueClientNames = [...new Set(clientNames)];

//     // // Fetch projects related to the filtered client names
//     // const filteredProjects = await prisma.project.findMany({
//     //   where: {
//     //     project_name: {
//     //       startsWith: uniqueClientNames.join('-'),  // Fetch projects for the filtered clients by matching the prefix
//     //       mode: 'insensitive',
//     //     },
//     //   },

//     //   take: 100,  // Limit to 100 results
//     // });

//     //console.log("Unique Client Names:", uniqueClientNames); // Debugging the unique client names
//     console.log("Filtered Projects:", uniqueClientNames); // Debugging the filtered projects
//     return res.status(200).json( uniqueClientNames );  // Return filtered projects and client names

//   } catch (error) {
//     console.error('Error fetching client suggestions:', error);
//     return res.status(500).json({ error: 'An error occurred while fetching client suggestions.' });
//   }
// };

exports.getClientSuggestionsFromProjects = async (req, res) => {
  const query = req.query.query;

  if (!query || query.trim().length < 1) {
    return res.status(400).json({ error: "Query parameter is required." });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        project_name: {
          startsWith: query, // Or use `contains` for more flexible search
          mode: "insensitive",
        },
      },
      take: 100,
    });

    const clientNames = projects.map((project) => {
      const [clientName] = project.project_name.split("-");
      return clientName;
    });

    const uniqueClientNames = [...new Set(clientNames)];

    return res.status(200).json({ uniqueClientNames });
  } catch (error) {
    console.error("Error fetching client suggestions:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching client suggestions." });
  }
};

exports.new_revision = async (req, res) => {
  const { revision_comments, delivery_date } = req.body;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (req.body.delivery_date) {
      const deliveryDate = new Date(req.body.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      req.body.delivery_date = deliveryDate;
    } else {
      return res.status(400).json({ error: "Delivery date is required." });
    }

    if (req.body.metting_date) {
      const meetingDate = new Date(req.body.metting_date);
      meetingDate.setHours(0, 0, 0, 0);
      req.body.metting_date = meetingDate;
    }

    const newRevision = await prisma.revision.create({
      data: {
        project_id: Number(project_id),
        revision_date: today,
        revision_comments,
        delivery_date: req.body.delivery_date,
        metting_link: req.body.metting_link || null,
        metting_date: req.body.metting_date || null,
        team: {
          connect: [{ id: project.team.id }], // ✅ Correct way to connect the team
        },
      },
    });

    res.status(200).json({
      message:
        "Project status updated to revision and revision record created successfully.",
      updatedProject,
      newRevision,
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
        status: "revision",
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
