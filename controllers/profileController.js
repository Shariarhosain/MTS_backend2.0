const { PrismaClient } = require('@prisma/client');
const { profile } = require('console');
const prisma = new PrismaClient();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Socket } = require('socket.io-client');

// Create an instance of express app
const app = express();
const server = http.createServer(app); // assuming you are using express
const io = socketIo(server);  // Create a new instance of Socket.IO


exports.selesView_recent_month = async (req, res) => {
    try {
        const currentDate = new Date();
        console.log('Current Date:', currentDate);
        
        // Current month (April)
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endOfCurrentMonth.setHours(23, 59, 59, 999);
     
        const startDate = startOfCurrentMonth;
        const endDate = endOfCurrentMonth;

        const salesData = await prisma.project.groupBy({
            by: ['profile_id'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                after_fiverr_amount: true,
                after_Fiverr_bonus: true
            }
        });


        console.log('Sales Data:', salesData);
       
        

        const salesDataWithProfileName = await Promise.all(salesData.map(async (data) => {
            if (data.profile_id) {  // Only proceed if profile_id is not null
                const profile = await prisma.profile.findUnique({
                    where: { id: data.profile_id },  // Query only if profile_id is valid
                    select: { profile_name: true }
                });
                return {
                    profile_name: profile?.profile_name || 'Unknown',
                    total_sales: Number(data._sum.after_fiverr_amount || 0) + Number(data._sum.after_Fiverr_bonus || 0),
                };
                
            } else {
                // If profile_id is null, return a default profile_name
                return {
                    profile_name: 'Unknown',  // Fallback value when no profile_id is provided
                    total_sales: data._sum.after_fiverr_amount + data._sum.after_Fiverr_bonus
                };
            }
        }));
        
        console.log(salesDataWithProfileName);
        // Emit the sales data to all connected clients
        return res.status(200).json({
            message: 'Sales data retrieved successfully',
            salesData: salesDataWithProfileName
        });
    } catch (error) {
        console.error('Error retrieving sales data:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving sales data', error: error.message });
    }
};











//////////////////////profile create 

exports.createProfile = async (req, res) => {
  try {
    const { profile_name, department_id, team_member_id } = req.body;

    if (!profile_name) {
      return res.status(400).json({ message: 'Profile name is required' });
    }

    const data = {
      profile_name,
      created_date: new Date(),
    };

    // --- Validation Checks ---

    // Check if department exists if department_id is provided
    if (department_id) {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(department_id) },
      });

      if (!department) {
        return res.status(404).json({ message: `Department with ID ${department_id} not found.` });
      }

      data.department = {
        connect: { id: parseInt(department_id) },
      };
    }

    // Check if team member exists if team_member_id is provided
    if (team_member_id) {
      // Note: The schema shows team_members on profile as a many-to-many relation.
      // If you intend to connect a single team member during creation,
      // the 'connect' syntax for many-to-many is slightly different.
      // Assuming you want to connect a single team member initially:
      const teamMember = await prisma.team_member.findUnique({
        where: { id: parseInt(team_member_id) },
      });

      if (!teamMember) {
        return res.status(404).json({ message: `Team member with ID ${team_member_id} not found.` });
      }

      // For a many-to-many relation, 'connect' expects an array
      data.team_members = {
         connect: [{ id: parseInt(team_member_id) }],
      };
      // If 'team_member_id' could be an array of IDs from the request body,
      // you would iterate and build the connect array accordingly.
      // For example:
      // if (Array.isArray(team_member_id)) {
      //   const connectTeamMembers = team_member_id.map(id => ({ id: parseInt(id) }));
      //   data.team_members = { connect: connectTeamMembers };
      // } else {
      //   data.team_members = { connect: [{ id: parseInt(team_member_id) }] };
      // }
    }

    // --- End Validation Checks ---

    const newProfile = await prisma.profile.create({
      data,
    });

    return res.status(201).json({ message: 'Profile created successfully', profile: newProfile });
  } catch (error) {
    console.error('Error creating profile:', error);
    // Catch potential remaining Prisma errors or other issues
    return res.status(500).json({ message: 'An error occurred while creating the profile', error: error.message });
  }
};

exports.getAllProfiles = async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        department: true, // Include the related department
        projects: true, // Include the related projects
     team_members: true, // Include the related team members
        profile_promotion: true, // Include the related promotions
        profile_ranking: true, // Include the related rankings
        profile_special_order: true, // Include the related special order
      },
    });

    return res.status(200).json({ message: 'Profiles retrieved successfully', profiles });
  } catch (error) {
    console.error('Error retrieving profiles:', error);
    return res.status(500).json({ message: 'An error occurred while retrieving profiles', error: error.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_name, department_id } = req.body;

    if (!profile_name) {
      return res.status(400).json({ message: 'Profile name is required' });
    }

    const data = {
      profile_name,
    };

    // Only update department if provided
    if (department_id) {
      data.department = {
        connect: { id: department_id }
      };
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: parseInt(id) },
      data,
    });

    return res.status(200).json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'An error occurred while updating the profile', error: error.message });
  }
};











exports.announcement = async (req, res) => {
  try {
    // 1️⃣ Fetch announcements where is_done is false
    const announcements = await prisma.anouncement.findMany({
      where: { is_done: false },
    });

    // 2️⃣ If none found, respond once
    if (announcements.length === 0) {
      return res.status(200).json({
        announcements: true,
      });
    }
    // 3️⃣ If found, respond with the announcements
    return res.status(200).json({
      announcements: false,
    });

  } catch (error) {
    console.error('Error retrieving announcements:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving announcements',
      error: error.message,
    });
  }
};

exports.announcementPost = async (req, res) => {
  try {
    const { done } = req.body;

    if (!done) {
      return res.status(400).json({
        message: 'Invalid request: done is required',
      });
    }
      // 3️⃣ Update all fetched announcements to is_done = true
    await prisma.anouncement.update({
      where: { id: 1 },
      data: { is_done: true },
    });

    // 4️⃣ Return the announcements
    return res.status(200).json({
      message: 'Announcements retrieved successfully',
      announcements: "done",
    });
  } catch (error) {
    console.error('Error updating announcements:', error);
    return res.status(500).json({
      message: 'An error occurred while updating announcements',
      error: error.message,
    });
  }
};




//////////////////////////////////////////////// Profile Ranking


exports.profileRanking = async (req, res) => {
  try {
    // Expect profileName and an array of ranking entries
    const {
      profileName,
      rankings
    } = req.body;

    // Validate that profileName is present and rankings is a non-empty array
    if (!profileName || !Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).json({
        message: 'Invalid request: profileName is required, and rankings must be a non-empty array.',
      });
    }

    // You might want to add validation here to ensure each item in the rankings array
    // has the expected properties (keywords, row, rankingPage).
    for (const rankingEntry of rankings) {
        if (!rankingEntry.keywords || rankingEntry.row === undefined || rankingEntry.rankingPage === undefined) {
             return res.status(400).json({
                message: 'Invalid request: Each item in the rankings array must contain keywords, row, and rankingPage.',
             });
        }
         // Optional: Add type checking if needed, e.g., typeof rankingEntry.row !== 'number'
    }


    /*model profile_ranking {
    id              Int           @id @default(autoincrement())
    profile_id      Int
    profile         profile       @relation(fields: [profile_id], references: [id])
    keywords        String?
    row             Int?
    ranking_page    String?
    created_date    DateTime?
    update_at       DateTime?
  }

  */
    const profile = await prisma.profile.findUnique({
      where: {
        profile_name: profileName
      },
    });

    if (!profile) {
      return res.status(404).json({
        message: `Profile with name "${profileName}" not found`,
      });
    }

    const profileId = profile.id;
    const createdRankings = [];

    // Loop through the array of rankings and create a new row for each
    for (const rankingEntry of rankings) {
      const createdRanking = await prisma.profile_ranking.create({
        data: {
          profile_id: profileId,
          keywords: rankingEntry.keywords,
          row: rankingEntry.row,
          ranking_page: rankingEntry.rankingPage,
          created_date: new Date(),
          update_at: new Date(),
        },
      });
      createdRankings.push(createdRanking);
    }

    return res.status(200).json({
      message: `${createdRankings.length} profile ranking entries created successfully.`, // More specific message
      createdRankings: createdRankings, // Return the created records
    });

  } catch (error) {
    console.error('Error creating profile ranking entries:', error); // Updated log message
    return res.status(500).json({
      message: 'An error occurred while creating the profile ranking entries', // Updated error message
      error: error.message,
    });
  }
};
exports.AllprofileRankingGet = async (req, res) => {
  try {
    // getall profile ranking data select all
    const profiles = await prisma.profile_ranking.findMany({
      include: {
        profile: true,
        
      },
      orderBy: {
        created_date: 'desc',
      },
    });
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({
        message: 'No profiles found',
      });
    }

    return res.status(200).json({
      message: 'All profiles retrieved successfully',
      profiles,
    });
  } catch (error) {
    console.error('Error retrieving profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving profile ranking',
      error: error.message,
    });
  }

    
};


exports.updateprofile_ranking = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }

    const updatedProfileRanking = await prisma.profile_ranking.update({
      where: { id: Number(id) },
      data: {
       ...req.body,
        update_at: new Date(),
      }, 
    });

    return res.status(200).json({
      message: 'Profile ranking updated successfully',
      profileRanking: updatedProfileRanking,
    });
  } catch (error) {
    console.error('Error updating profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile ranking',
      error: error.message,
    });
  }
};

exports.deleteProfileRanking = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }
    // Delete the profile ranking
    const deletedProfileRanking = await prisma.profile_ranking.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({
      message: 'Profile ranking deleted successfully',
      profileRanking: deletedProfileRanking,
    });
  } catch (error) {
    console.error('Error deleting profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while deleting the profile ranking',
      error: error.message,
    });
  }
};










/////////////////////// Profile Promotion
exports.promotionprofile = async (req, res) => {
  try {
    const { profileName, promotionAmount, clicks, impressions } = req.body;

    if (!profileName || promotionAmount == null) {
      return res.status(400).json({
        message: 'Invalid request: profileName and promotionAmount are required',
      });
    }

    // Find the profile
    const profile = await prisma.profile.findUnique({
      where: { profile_name: profileName },
    });

    if (!profile) {
      return res.status(404).json({
        message: 'Profile not found',
      });
    }

    const profileId = profile.id;

    // Get the last promotion entry (yesterday's or most recent)
    const lastPromotion = await prisma.profile_promotion.findFirst({
      where: { profile_id: profileId },
      orderBy: { created_date: 'desc' },
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let actual_increase = promotionAmount;
    if (lastPromotion && lastPromotion.promotion_amount) {
      actual_increase = promotionAmount - Number(lastPromotion.promotion_amount);
    }

    // Reset check: If last entry is from last month, reset amount
    let reset = false;
    if (
      lastPromotion &&
      new Date(lastPromotion.created_date).getMonth() !== currentMonth
    ) {
      actual_increase = promotionAmount; // treat it as new
      reset = true;
    }

    const profilePromotion = await prisma.profile_promotion.create({
      data: {
        profile_id: profileId,
        promotion_amount: promotionAmount,
        actual_increase,
        clicks: clicks || 0,
        impressions: impressions || 0,
        created_date: new Date(),
        update_at: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Profile promotion created successfully',
      reset,
      profilePromotion,
    });
  } catch (error) {
    console.error('Error creating profile promotion:', error);
    return res.status(500).json({
      message: 'An error occurred while creating the profile promotion',
      error: error.message,
    });
  }
};
exports.updateprofile_promotion = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        message: 'ID is required to update profile promotion',
      });
    }

    // Optional fields from req.body
    const {
      promotion_amount,
      clicks,
      impressions,
    } = req.body;

    // Build dynamic update data
    const updateData = {
      update_at: new Date(),
    };

    // Fetch the current promotion entry before updating
    const currentPromotion = await prisma.profile_promotion.findUnique({
      where: { id: Number(id) },
      select: { // Select necessary fields
        profile_id: true,
        promotion_amount: true,
        created_date: true,
      }
    });

    if (!currentPromotion) {
        return res.status(404).json({
            message: 'Profile promotion entry not found',
        });
    }

    // If promotion_amount is being updated, recalculate actual_increase
    if (promotion_amount != null) {
      updateData.promotion_amount = promotion_amount;

      // Find the previous promotion entry for the same profile, ordered by creation date descending
      const previousPromotion = await prisma.profile_promotion.findFirst({
        where: {
          profile_id: currentPromotion.profile_id,
          created_date: {
            lt: currentPromotion.created_date, // Find entries created before the current one
          },
          // Optionally, you might want to exclude the current ID in case of identical timestamps,
          // though ordering by date and taking the first should generally suffice.
          // NOT: {
          //     id: Number(id)
          // }
        },
        orderBy: {
          created_date: 'desc',
        },
      });

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let actual_increase = promotion_amount; // Default if no previous or monthly reset

      if (previousPromotion && previousPromotion.promotion_amount != null) {
        const previousMonth = new Date(previousPromotion.created_date).getMonth();
        const previousYear = new Date(previousPromotion.created_date).getFullYear();

        // Check for monthly reset condition
        if (previousMonth === currentMonth && previousYear === currentYear) {
            // If in the same month and year, calculate difference from previous
            actual_increase = promotion_amount - Number(previousPromotion.promotion_amount);
        } else {
            // If in a different month/year, it's a monthly reset, so actual_increase is the new amount
             actual_increase = promotion_amount;
        }
      }
      
      updateData.actual_increase = actual_increase;

    }

    if (clicks != null) updateData.clicks = clicks;
    if (impressions != null) updateData.impressions = impressions;

    // Perform the update
    const updated = await prisma.profile_promotion.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Profile promotion updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating profile promotion:', error);
    return res.status(500).json({
      message: 'Failed to update profile promotion',
      error: error.message,
    });
  }
};

exports.AllprofilePromotionGet = async (req, res) => {
  try {
    const profiles = await prisma.profile_promotion.findMany({
      include: {
        profile: true,
      },
      orderBy: {
        created_date: 'desc',
      },
    });

    if (!profiles || profiles.length === 0) {
      return res.status(404).json({
        message: 'No profile promotion data found',
      });
    }

    return res.status(200).json({
      message: 'All profile promotions retrieved successfully',
      data: profiles,
    });
  } catch (error) {
    console.error('Error retrieving profile promotions:', error);
    return res.status(500).json({
      message: 'Failed to retrieve profile promotions',
      error: error.message,
    });
  }
};


exports.deleteProfilePromotion = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }
    // Delete the profile ranking
    const deletedProfilePromotion = await prisma.profile_promotion.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({
      message: 'Profile promotion deleted successfully',
      profilePromotion: deletedProfilePromotion,
    });
  } catch (error) {
    console.error('Error deleting profile promotion:', error);
    return res.status(500).json({
      message: 'An error occurred while deleting the profile promotion',
      error: error.message,
    });
  }
};





exports.createProjectSpecialOrder = async (req, res) => {
  try {
    const { profileName, special_order_amount, delivery_date, client_name } = req.body;

    if (!profileName || !special_order_amount || !delivery_date || !client_name) {
      return res.status(400).json({
        message: 'Invalid request: profileName, special_order_amount, delivery_date, and client_name are required',
      });
    }
    //get profile id
    const profile = await prisma.profile.findUnique({
      where: { profile_name: profileName },
    });

    if (!profile) {
      return res.status(404).json({
        message: 'Profile not found',
      });
    }

    const newOrder = await prisma.project_special_order.create({
      data: {
        profile_id: profile.id,
        special_order_amount: special_order_amount ? parseFloat(special_order_amount) : null,
        delivery_date: delivery_date ? new Date(delivery_date) : null,
        client_name,
        created_date: new Date(),
        update_at: new Date(),
      },
    });
    res.status(201).json({
      message: 'Special order created successfully',
      order: newOrder,
    });
  } catch (error) {
    console.error('Error creating special order:', error);
    res.status(500).json({ error: 'Failed to create special order' });
  }
};
exports.updateProjectSpecialOrder = async (req, res) => {
  const { id } = req.params;
  const { profileName, special_order_amount, delivery_date, client_name } = req.body;

  try {
    const dataForUpdate = {
      update_at: new Date(), // Always update the modification timestamp
    };

    // 1. Handle profile_id update if profileName is provided
    if (profileName) {
      const profile = await prisma.profile.findUnique({
        where: { profile_name: profileName },
      });

      if (!profile) {
        return res.status(404).json({
          message: `Profile with name '${profileName}' not found`,
        });
      }
      dataForUpdate.profile_id = profile.id;
    } else if (req.body.hasOwnProperty('profileName') && profileName === null) {
      // If profileName is explicitly passed as null, you might want to clear the profile_id
      // This depends on your application's requirements.
      // dataForUpdate.profile_id = null;
    }


    // 2. Handle other updatable fields from req.body
    if (special_order_amount !== undefined) {
      const amount = parseFloat(special_order_amount);
      if (isNaN(amount)) {
        return res.status(400).json({ message: 'Invalid special_order_amount format.' });
      }
      dataForUpdate.special_order_amount = amount;
    }

    if (delivery_date) {
      const parsedDate = new Date(delivery_date);
      // Check if the parsedDate is a valid date
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid delivery_date format. Please use a valid date string (e.g., YYYY-MM-DD).' });
      }
      dataForUpdate.delivery_date = parsedDate;
    }

    if (client_name !== undefined) {
      // Assuming client_name can be an empty string if provided.
      // If client_name should only be updated if it's a non-empty string:
      // if (typeof client_name === 'string' && client_name.trim() !== '') {
      //   dataForUpdate.client_name = client_name;
      // } else if (client_name !== undefined) {
      //   return res.status(400).json({ message: 'client_name must be a non-empty string if provided.'});
      // }
      dataForUpdate.client_name = client_name;
    }

    // Add any other fields from req.body that are part of your project_special_order schema
    // and you want to make updatable. For example:
    // if (req.body.status !== undefined) {
    //   dataForUpdate.status = req.body.status;
    // }

    // Ensure there's something to update besides 'update_at' if no profileName was handled
    // This prevents an update call with only `update_at` if other fields are also absent.
    // However, if only profileName was provided and was valid, it's a valid update.
    const updateKeys = Object.keys(dataForUpdate);
    if (updateKeys.length === 1 && updateKeys[0] === 'update_at' && !req.body.hasOwnProperty('profileName')) {
        // If only update_at is set and profileName wasn't even in the request,
        // it implies no actual data fields were provided for update.
        // You might want to return a message or proceed depending on desired behavior.
        // For now, we'll allow it, as an "empty" update just touches update_at.
    }


    const updatedOrder = await prisma.project_special_order.update({
      where: { id: parseInt(id) }, // Ensure 'id' is an integer
      data: dataForUpdate,
      include: { profile: true }, // Include related profile data in the response
    });

    res.json({
      message: 'Special order updated successfully',
      order: updatedOrder,
    });

  } catch (error) {
    console.error('Error updating special order:', error);
    // Handle Prisma-specific error for record not found during update
    if (error.code === 'P2025') {
      return res.status(404).json({ message: `Special order with ID ${id} not found.` });
    }
    res.status(500).json({ error: 'Failed to update special order', details: error.message });
  }
};
exports.getProjectSpecialOrder = async (req, res) => {
 // get all project special orders

 try {
   const orders = await prisma.project_special_order.findMany({
     include: { profile: true },
   });
   res.json({
      message: 'Project special orders retrieved successfully',
      orders,
   });
 } catch (error) {
   console.error('Error getting project special orders:', error);
   res.status(500).json({ error: 'Failed to get project special orders' });
 }
};




exports.deleteProjectSpecialOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.project_special_order.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    console.error('Error deleting special order:', error);
    res.status(500).json({ error: 'Failed to delete special order' });
  }
};

















// Helper function to get the start and end dates of a quarter
function getQuarterDates(year, quarter) {
    let startDate, endDate;
    switch (quarter) {
        case 1: // Q1: Jan - Mar
            startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999));
            break;
        case 2: // Q2: Apr - Jun
            startDate = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999));
            break;
        case 3: // Q3: Jul - Sep
            startDate = new Date(Date.UTC(year, 6, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999));
            break;
        case 4: // Q4: Oct - Dec
            startDate = new Date(Date.UTC(year, 9, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            break;
        default:
            throw new Error('Invalid quarter number');
    }
    return { startDate, endDate };
}

// Helper function to get the current quarter and year
function getCurrentQuarterAndYear() {
    const now = new Date();
    const month = now.getUTCMonth(); // 0-indexed
    const year = now.getUTCFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return { year, quarter };
}

// API endpoint handler to get quarterly performance based on user role
exports.getQuarterlyPerformance = async (req, res) => {
    let user;
    try {
        // Fetch user details from the database using the uid from the authenticated request
        // This assumes your auth middleware guarantees req.user and req.user.uid exist
        if (!req.user || !req.user.uid) {
             console.log('Authentication failed: req.user or req.user.uid is missing.');
             return res.status(401).json({ error: 'Unauthorized: Authentication data missing' });
        }

        user = await prisma.team_member.findUnique({
            where: { uid: req.user.uid },
            select: {
                role: true,
                id: true,
                team_id: true, // Assuming you have a team_id field in your user model
            }
        });
        console.log('User details fetched:', user);

    } catch (fetchUserError) {
        console.error('Error fetching user details from DB:', fetchUserError);
         // This catch handles DB errors during the user lookup.
        return res.status(500).json({ error: 'Internal server error fetching user data' });
    }


    const userRole = user?.role?.toLowerCase();
    const userId = user?.id;
    const userTeamId = user?.team_id; // Assuming user object has team_id

    // Log received user info for debugging
    console.log('User Role:', userRole);
    console.log('User ID:', userId);
    console.log('User Team ID:', userTeamId);


    if (!user || !userRole || !userId) {
        // This check is still valuable if the DB lookup somehow returns null or incomplete data
        console.log('Unauthorized access attempt: User fetched but missing role or id');
        return res.status(401).json({ error: 'Unauthorized: User data incomplete in DB' });
    }

    // Determine the quarter to query (e.g., current quarter, or allow query param)
    // Allow specifying year and quarter via query parameters, default to current quarter
    const queryYear = parseInt(req.query.year);
    const queryQuarter = parseInt(req.query.quarter);

    let targetYear, targetQuarter;

    if (!isNaN(queryYear) && !isNaN(queryQuarter) && queryQuarter >= 1 && queryQuarter <= 4) {
        targetYear = queryYear;
        targetQuarter = queryQuarter;
    } else {
        // Default to current quarter if no valid query params
        const { year, quarter } = getCurrentQuarterAndYear();
        targetYear = year;
        targetQuarter = quarter;
    }

    console.log(`Workspaceing data for Quarter ${targetQuarter}, Year ${targetYear}`);

    const { startDate, endDate } = getQuarterDates(targetYear, targetQuarter);

    try {
        let responseData = {
            quarter: targetQuarter,
            year: targetYear,
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
            // WARNING: Calculations use standard JavaScript numbers which may have
            // floating-point precision issues for monetary values.
            precisionWarning: "Calculations use standard JavaScript numbers, potentially leading to minor precision issues."
        };

        // --- Role-based Data Fetching and Aggregation ---

        if (userRole.startsWith('hod_')) {
            // HOD: See all team quarter-wise performance
            console.log('Role: HOD. Fetching all teams quarterly performance.');

            // Fetch all teams to get their current targets
            const allTeams = await prisma.team.findMany({
                 select: {
                    id: true,
                    team_name: true,
                    team_target: true, // Get current monthly target
                },
            });

            const allTeamsQuarterly = [];

            for (const team of allTeams) {
                 // Calculate quarterly target based on current monthly target * 3
                 const quarterlyTargetBasedOnCurrent = parseFloat(team.team_target || '0') * 3;

                 // Fetch historical monthly records for this team in the quarter
                 const teamMonthlyHistory = await prisma.TeamTargetHistory.findMany({
                    where: {
                        team_id: team.id,
                        start_date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        team_target: true, // Monthly target from history
                        total_achived: true, // Monthly achieved from history
                    },
                });

                console.log(`HOD: Fetched ${teamMonthlyHistory.length} monthly history records for team ${team.team_name} in the quarter.`);

                // Aggregate historical monthly targets and achievements
                const aggregatedHistory = teamMonthlyHistory.reduce((acc, monthlyRecord) => {
                    acc.historicalTargetSum += parseFloat(monthlyRecord.team_target || '0');
                    acc.achievedSum += parseFloat(monthlyRecord.total_achived || '0');
                    return acc;
                }, { historicalTargetSum: 0, achievedSum: 0 });


                allTeamsQuarterly.push({
                    team_id: team.id,
                    team_name: team.team_name,
                    target: quarterlyTargetBasedOnCurrent, // Target based on current monthly * 3
                    achieved: aggregatedHistory.achievedSum, // Sum of historical achieved
                    historical_quarterly_target: aggregatedHistory.historicalTargetSum, // Sum of historical targets
                    difference: aggregatedHistory.achievedSum - aggregatedHistory.historicalTargetSum, // Difference based on historical target
                });
            }

            responseData.allTeamsQuarterly = allTeamsQuarterly;
             console.log(`HOD: Calculated quarterly performance for ${responseData.allTeamsQuarterly.length} teams.`);


        } else if (userRole.endsWith('_leader')) {
            // Operation Leader or Sales Leader: See own quarter performance and team performance
            console.log('Role: Leader. Fetching own and team quarterly performance.');

            // 1. Fetch Own Quarter Performance
             console.log('Leader: Fetching own current target and quarterly history...');
             const ownMember = await prisma.team_member.findUnique({
                where: { id: userId },
                select: {
                    target: true, // Get current monthly target
                }
             });

             const ownQuarterlyTargetBasedOnCurrent = parseFloat(ownMember?.target || '0') * 3; // Calculate quarterly target based on current


            const memberMonthlyHistory = await prisma.TeamMemberTargetHistory.findMany({
                where: {
                    team_member_id: userId,
                     // Filter by the date range of the target quarter
                    start_date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: {
                    target_amount: true, // Monthly target from history
                    total_achived: true, // Monthly achieved from history
                },
            });
            console.log(`Leader: Fetched ${memberMonthlyHistory.length} monthly own history records for the quarter.`);

            // Aggregate historical monthly targets and achievements
             const aggregatedOwnHistory = memberMonthlyHistory.reduce((acc, monthlyRecord) => {
                 acc.historicalTargetSum += parseFloat(monthlyRecord.target_amount || '0');
                 acc.achievedSum += parseFloat(monthlyRecord.total_achived || '0');
                 return acc;
             }, { historicalTargetSum: 0, achievedSum: 0 });


            responseData.ownQuarterlyPerformance = {
                target: ownQuarterlyTargetBasedOnCurrent, // Target based on current monthly * 3
                achieved: aggregatedOwnHistory.achievedSum, // Sum of historical achieved
                historical_quarterly_target: aggregatedOwnHistory.historicalTargetSum, // Sum of historical targets
                difference: aggregatedOwnHistory.achievedSum - aggregatedOwnHistory.historicalTargetSum, // Difference based on historical target
            };
            console.log('Leader: Own quarterly performance calculated.');


            // 2. Fetch Team Quarter Performance (only if the leader is part of a team)
            if (userTeamId) {
                console.log(`Leader: Fetching team (ID: ${userTeamId}) current target and quarterly history...`);
                 const team = await prisma.team.findUnique({
                    where: { id: userTeamId },
                     select: {
                        team_name: true, // To get the team name
                        team_target: true, // Get current monthly target
                    },
                });

                const teamQuarterlyTargetBasedOnCurrent = parseFloat(team?.team_target || '0') * 3; // Calculate quarterly target based on current

                 const teamMonthlyHistory = await prisma.TeamTargetHistory.findMany({
                    where: {
                        team_id: userTeamId,
                         // Filter by the date range of the target quarter
                        start_date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                     select: {
                         team_target: true, // Monthly target from history
                         total_achived: true, // Monthly achieved from history
                     },
                });
                 console.log(`Leader: Fetched ${teamMonthlyHistory.length} monthly team history records for the quarter.`);

                 // Aggregate historical monthly targets and achievements
                 const aggregatedTeamHistory = teamMonthlyHistory.reduce((acc, monthlyRecord) => {
                     acc.historicalTargetSum += parseFloat(monthlyRecord.team_target || '0');
                     acc.achievedSum += parseFloat(monthlyRecord.total_achived || '0');
                     return acc;
                 }, { historicalTargetSum: 0, achievedSum: 0 });

                const teamName = team?.team_name || 'Unknown Team';

                responseData.teamQuarterlyPerformance = {
                    team_id: userTeamId,
                    team_name: teamName,
                    target: teamQuarterlyTargetBasedOnCurrent, // Target based on current monthly * 3
                    achieved: aggregatedTeamHistory.achievedSum, // Sum of historical achieved
                    historical_quarterly_target: aggregatedTeamHistory.historicalTargetSum, // Sum of historical targets
                    difference: aggregatedTeamHistory.achievedSum - aggregatedTeamHistory.historicalTargetSum, // Difference based on historical target
                };
                console.log('Leader: Team quarterly performance calculated.');


                 // 3. Fetch Member Performance within the leader's team for the quarter
                 console.log(`Leader: Fetching team members' current targets and quarterly history for team (ID: ${userTeamId})...`);

                const teamMembers = await prisma.team_member.findMany({
                    where: { team_id: userTeamId },
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        target: true, // Get current monthly target for each member
                    }
                });

                 const teamMembersQuarterly = [];

                 for (const member of teamMembers) {
                     const memberQuarterlyTargetBasedOnCurrent = parseFloat(member.target || '0') * 3; // Calculate quarterly target based on current

                     const memberMonthlyHistory = await prisma.TeamMemberTargetHistory.findMany({
                        where: {
                            team_member_id: member.id,
                            start_date: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                         select: {
                             target_amount: true, // Monthly target from history
                             total_achived: true, // Monthly achieved from history
                         },
                         orderBy: {
                            start_date: 'asc'
                         }
                     });
                     console.log(`Leader: Fetched ${memberMonthlyHistory.length} monthly history records for team member ${member.first_name || member.id} in the quarter.`);


                    // Aggregate historical monthly targets and achievements
                    const aggregatedMemberHistory = memberMonthlyHistory.reduce((acc, monthlyRecord) => {
                        acc.historicalTargetSum += parseFloat(monthlyRecord.target_amount || '0');
                        acc.achievedSum += parseFloat(monthlyRecord.total_achived || '0');
                        return acc;
                    }, { historicalTargetSum: 0, achievedSum: 0 });


                     teamMembersQuarterly.push({
                        team_member_id: member.id,
                        team_member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                        quarterly_target: memberQuarterlyTargetBasedOnCurrent, // Target based on current monthly * 3
                        achieved: aggregatedMemberHistory.achievedSum, // Sum of historical achieved
                        historical_quarterly_target: aggregatedMemberHistory.historicalTargetSum, // Sum of historical targets
                        difference: aggregatedMemberHistory.achievedSum - aggregatedMemberHistory.historicalTargetSum, // Difference based on historical target
                    });
                 }

                 responseData.teamMembersQuarterly = teamMembersQuarterly;
                 console.log(`Leader: Calculated quarterly performance for ${responseData.teamMembersQuarterly.length} team members.`);


            } else {
                 console.log('Leader does not have a team_id. Skipping team and team member performance fetch.');
            }


        } else if (userRole.endsWith('_member')) {
             // Operation Member or Sales Member: See only own quarter performance
             console.log('Role: Member. Fetching own current target and quarterly history.');

             const ownMember = await prisma.team_member.findUnique({
                where: { id: userId },
                select: {
                    target: true, // Get current monthly target
                }
             });

             const ownQuarterlyTargetBasedOnCurrent = parseFloat(ownMember?.target || '0') * 3; // Calculate quarterly target based on current


             const memberMonthlyHistory = await prisma.TeamMemberTargetHistory.findMany({
                where: {
                    team_member_id: userId,
                     // Filter by the date range of the target quarter
                    start_date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: {
                    target_amount: true, // Monthly target from history
                    total_achived: true, // Monthly achieved from history
                },
            });
             console.log(`Member: Fetched ${memberMonthlyHistory.length} monthly own history records for the quarter.`);


             // Aggregate historical monthly targets and achievements
            const aggregatedOwnHistory = memberMonthlyHistory.reduce((acc, monthlyRecord) => {
                acc.historicalTargetSum += parseFloat(monthlyRecord.target_amount || '0');
                acc.achievedSum += parseFloat(monthlyRecord.total_achived || '0');
                return acc;
            }, { historicalTargetSum: 0, achievedSum: 0 });


            responseData.ownQuarterlyPerformance = {
                target: ownQuarterlyTargetBasedOnCurrent, // Target based on current monthly * 3
                achieved: aggregatedOwnHistory.achievedSum, // Sum of historical achieved
                historical_quarterly_target: aggregatedOwnHistory.historicalTargetSum, // Sum of historical targets
                difference: aggregatedOwnHistory.achievedSum - aggregatedOwnHistory.historicalTargetSum, // Difference based on historical target
            };
            console.log('Member: Own quarterly performance calculated.');

        } else {
            // Handle other roles or no role found
            console.log(`Access denied for role: ${userRole}`);
            return res.status(403).json({ error: 'Access denied for this role.' });
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error fetching quarterly performance:', error);
        // Added error.message to provide more details in the response
        res.status(500).json({ error: 'Failed to fetch performance data', details: error.message });
    }
};




















// Assuming prisma client is initialized elsewhere
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// Helper function to generate the predefined week structures for a given month
function generatePredefinedWeeks(year, monthIndex) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[monthIndex];
    const lastDayOfMonthObject = new Date(year, monthIndex + 1, 0);
    const lastDayOfCurrentMonthNumber = lastDayOfMonthObject.getDate();

    return [
        {
            week: 'Week 1',
            range: `${currentMonthName} 1 - ${currentMonthName} 7`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 2',
            range: `${currentMonthName} 8 - ${currentMonthName} 14`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 8, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 3',
            range: `${currentMonthName} 15 - ${currentMonthName} 21`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 15, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 4',
            range: `${currentMonthName} 22 - ${currentMonthName} ${lastDayOfCurrentMonthNumber}`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 22, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, lastDayOfCurrentMonthNumber, 23, 59, 59, 999)),
            amount: 0,
        }
    ];
}

// Custom deep copy function to preserve Date objects and reset amounts
function deepCopyWeeklySummary(weeksArray) {
    return weeksArray.map(week => ({
        // Copy all properties from the original week object
        ...week,
        // Explicitly create new Date objects to ensure they are instances of Date
        _internal_start_date: new Date(week._internal_start_date.getTime()),
        _internal_end_date: new Date(week._internal_end_date.getTime()),
        // Ensure amount is reset for the fresh copy
        amount: 0
    }));
}

exports.getMonthlyProfileActivityChart = async (req, res) => {
  try {
    const now = new Date(); // Current server time: May 15, 2025
    const year = now.getFullYear(); // 2025
    const monthIndex = now.getMonth(); // 4 (for May, 0-indexed)

    const baseWeeksDefinition = generatePredefinedWeeks(year, monthIndex);

    // Use UTC dates for Prisma query to align with UTC week definitions
    const firstDayOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const firstDayOfNextMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    const rankingsThisMonth = await prisma.profile_ranking.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonthUTC,
          lt: firstDayOfNextMonthUTC,
        },
      },
      include: {
        profile: {
          select: { profile_name: true, id: true },
        },
      },
      orderBy: { created_date: 'asc' },
    });

    const promotionsThisMonth = await prisma.profile_promotion.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonthUTC,
          lt: firstDayOfNextMonthUTC,
        },
      },
      include: {
        profile: {
          select: { profile_name: true, id: true },
        },
      },
      orderBy: { created_date: 'asc' },
    });

    const groupedActivity = {};

    rankingsThisMonth.forEach(ranking => {
      const profileName = ranking.profile ? ranking.profile.profile_name : 'Unknown Profile';
      if (!groupedActivity[profileName]) {
        groupedActivity[profileName] = {
          profileId: ranking.profile_id,
          ranking: [],
          promotion: {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
          },
        };
      }
      groupedActivity[profileName].ranking.push({
        date: ranking.created_date,
        keywords: ranking.keywords,
        row: ranking.row,
        rankingPage: ranking.ranking_page,
      });
    });

    promotionsThisMonth.forEach(promotion => {
      const profileName = promotion.profile ? promotion.profile.profile_name : 'Unknown Profile';
      const numPromotionAmount = parseFloat(promotion.promotion_amount) || 0;
      const promotionDate = new Date(promotion.created_date);

      if (!groupedActivity[profileName]) {
        groupedActivity[profileName] = {
          profileId: promotion.profile_id,
          ranking: [],
          promotion: {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
          },
        };
      } else if (!groupedActivity[profileName].promotion) {
         groupedActivity[profileName].promotion = {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
         };
      }
      // Ensure weeklySummary exists if promotion object was somehow partially initialized
      // This should be redundant if the above initializations are correct
      else if (!groupedActivity[profileName].promotion.weeklySummary) {
        groupedActivity[profileName].promotion.weeklySummary = deepCopyWeeklySummary(baseWeeksDefinition);
      }


      groupedActivity[profileName].promotion.totalAmountThisMonth += numPromotionAmount;

      for (const weekDefinition of groupedActivity[profileName].promotion.weeklySummary) {
        // Now both promotionDate and weekDefinition._internal_..._date are proper Date objects
        if (promotionDate >= weekDefinition._internal_start_date && promotionDate <= weekDefinition._internal_end_date) {
          weekDefinition.amount += numPromotionAmount;
          break; 
        }
      }
    });

    Object.values(groupedActivity).forEach(profileData => {
      if (profileData.promotion && profileData.promotion.weeklySummary) {
        profileData.promotion.weeklySummary.forEach(week => {
          delete week._internal_start_date;
          delete week._internal_end_date;
        });
      }
    });

    if (Object.keys(groupedActivity).length === 0) {
      return res.status(404).json({
        message: 'No profile activity (rankings or promotions) found for the current month.',
        data: {},
      });
    }

    return res.status(200).json({
      message: 'Monthly profile activity grouped by profile retrieved successfully.',
      data: groupedActivity,
      month: monthIndex + 1,
      year: year,
    });

  } catch (error) {
    console.error('Error retrieving grouped monthly profile activity:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving grouped monthly profile activity.',
      error: error.message,
    });
  }
};





















const getTodayDateRange = () => {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  return { startOfToday, endOfToday };
};

const getMonthDateRange = () => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
  return { startOfMonth, endOfMonth };
};

exports.getAllConsolidatedReports = async (req, res) => {
  try {
    const { startOfToday, endOfToday } = getTodayDateRange();
    const { startOfMonth, endOfMonth } = getMonthDateRange();

    const reports = {};

    // --- 1) Total project delivery this month ---
    const deliveredProjectsMonth = await prisma.project.findMany({
      where: {
        status: 'delivered',
        is_delivered: true,
        delivery_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countDeliveredMonth = deliveredProjectsMonth.length;
    const totalAmountDeliveredMonth = deliveredProjectsMonth.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.totalMonthlyDeliveries = {
      count: countDeliveredMonth,
      total_after_fiverr_and_bonus: totalAmountDeliveredMonth.toFixed(2),
      project_details: deliveredProjectsMonth.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
      })),
    };

    // --- 2) Total project ordered this month ---
    const orderedProjectsMonth = await prisma.project.findMany({
      where: {
        date: { // Assuming 'date' field represents the order creation date
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countOrderedMonth = orderedProjectsMonth.length;
    const totalAmountOrderedMonth = orderedProjectsMonth.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.totalMonthlyOrders = {
      count: countOrderedMonth,
      total_after_fiverr_and_bonus: totalAmountOrderedMonth.toFixed(2),
      project_details: orderedProjectsMonth.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
      })),
    };

    // --- 3) Total cancel this month ---
    const cancelledProjectsMonth = await prisma.project.findMany({
      where: {
        status: 'cancelled', // Assuming a 'cancelled' status
        update_at: { // Assuming cancellation date is reflected in update_at
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countCancelledMonth = cancelledProjectsMonth.length;
    const totalAfterFiverrCancelledMonth = cancelledProjectsMonth.reduce((sum, project) => {
      return sum + (project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0);
    }, 0);

    reports.totalMonthlyCancellations = {
      count: countCancelledMonth,
      total_after_fiverr: totalAfterFiverrCancelledMonth.toFixed(2),
      project_details: cancelledProjectsMonth.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
      })),
    };

    // --- 4) Today's delivery ---
    const deliveredProjectsToday = await prisma.project.findMany({
      where: {
        status: 'delivered',
        is_delivered: true,
        delivery_date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countDeliveredToday = deliveredProjectsToday.length;
    const totalAmountDeliveredToday = deliveredProjectsToday.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.todaysDeliveries = {
      count: countDeliveredToday,
      total_after_fiverr_and_bonus: totalAmountDeliveredToday.toFixed(2),
      project_details: deliveredProjectsToday.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
      })),
    };

    // --- 5) Today's order project ---
    const orderedProjectsToday = await prisma.project.findMany({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
        team_member: { select: { first_name: true, last_name: true, team: { select: { team_name: true } } } },
      },
    });

    const countOrderedToday = orderedProjectsToday.length;
    const totalAmountOrderedToday = orderedProjectsToday.reduce((sum, project) => {
      return sum + (project.order_amount ? parseFloat(project.order_amount) : 0);
    }, 0);

    reports.todaysOrders = {
      count: countOrderedToday,
      total_amount: totalAmountOrderedToday.toFixed(2),
      project_details: orderedProjectsToday.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        order_amount: project.order_amount,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        ordered_by_member: project.team_member ? `${project.team_member.first_name} ${project.team_member.last_name}` : 'N/A',
        ordered_by_team: project.team_member?.team ? project.team_member.team.team_name : 'N/A',
      })),
    };

    // --- 6) Promotion Costs ---
    const todaysPromotions = await prisma.profile_promotion.findMany({
      where: {
        created_date: { gte: startOfToday, lte: endOfToday },
      },
      include: { profile: { select: { profile_name: true } } },
    });

    const totalTodayPromotionCost = todaysPromotions.reduce((sum, promo) => {
      return sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0);
    }, 0);

    // Calculate total actual_increase for today
    const totalActualIncreaseToday = todaysPromotions.reduce((sum, promo) => {
        return sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0);
    }, 0);

    const monthlyPromotions = await prisma.profile_promotion.findMany({
      where: {
        created_date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { profile: { select: { profile_name: true } } },
    });

    const totalMonthlyPromotionCost = monthlyPromotions.reduce((sum, promo) => {
      return sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0);
    }, 0);

    // Calculate total actual_increase for this month
    const totalActualIncreaseMonth = monthlyPromotions.reduce((sum, promo) => {
        return sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0);
    }, 0);

    reports.promotionCosts = {
      today_promotion: {
        total_cost: totalTodayPromotionCost.toFixed(2),
        total_actual_increase: totalActualIncreaseToday.toFixed(2), // Added total actual_increase
        profile_costs: todaysPromotions.map(promo => ({
          profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
          promotion_amount: promo.promotion_amount,
          actual_increase: promo.actual_increase
        })),
      },
      this_month_promotion: {
        total_cost: totalMonthlyPromotionCost.toFixed(2),
        total_actual_increase: totalActualIncreaseMonth.toFixed(2), // Added total actual_increase
        profile_costs: monthlyPromotions.map(promo => ({
          profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
          promotion_amount: promo.promotion_amount,
          actual_increase: promo.actual_increase
        })),
      },
    };

    // --- 7) Project Special Order Stats ---
    const todaysSpecialOrders = await prisma.project_special_order.findMany({
      where: {
        created_date: { gte: startOfToday, lte: endOfToday },
      },
      include: { profile: { select: { profile_name: true } } },
    });

    const todaySpecialOrderCount = todaysSpecialOrders.length;
    const totalTodaySpecialOrderCost = todaysSpecialOrders.reduce((sum, order) => {
      return sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0);
    }, 0);

    const monthlySpecialOrders = await prisma.project_special_order.findMany({
      where: {
        created_date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { profile: { select: { profile_name: true } } },
    });

    const monthlySpecialOrderCount = monthlySpecialOrders.length;
    const totalMonthlySpecialOrderCost = monthlySpecialOrders.reduce((sum, order) => {
      return sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0);
    }, 0);

    reports.specialOrderStats = {
      today_special_order: {
        count: todaySpecialOrderCount,
        total_cost: totalTodaySpecialOrderCost.toFixed(2),
        order_details: todaysSpecialOrders.map(order => ({
          client_name: order.client_name,
          profile_name: order.profile ? order.profile.profile_name : 'N/A',
          amount: order.special_order_amount,
        })),
      },
      this_month_special_order: {
        count: monthlySpecialOrderCount,
        total_cost: totalMonthlySpecialOrderCost.toFixed(2),
        order_details: monthlySpecialOrders.map(order => ({
          client_name: order.client_name,
          profile_name: order.profile ? order.profile.profile_name : 'N/A',
          amount: order.special_order_amount,
        })),
      },
    };

    res.status(200).json(reports);

  } catch (error) {
    console.error('Error fetching all consolidated reports:', error);
    res.status(500).json({ error: 'An error occurred while fetching consolidated reports.' });
  }
};




// exports.getProfileCurrentMonthWeeklyDetails = async (req, res) => {
//   try {
//     // 1. Determine Current Year and Month
//     const currentServerDate = new Date();
//     const year = currentServerDate.getFullYear();
//     const monthIndex = currentServerDate.getMonth(); // 0-indexed (e.g., January is 0, May is 4)
//     const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
//     const currentMonthName = monthNames[monthIndex];

//     // Calculate the last day of the current month for the range string
//     const lastDayOfCurrentMonthNumber = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

//     // 2. Define Week Structures (including string ranges and placeholder target)
//     // This base definition will be deep-copied for each profile.
//     const baseWeeksDefinition = [
//       {
//         week: 'Week 1',
//         range: `${currentMonthName} 1 - ${currentMonthName} 7`,
//         _internal_start_date: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
//         _internal_end_date: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)),
//         amount: 0,
//         clients: [] // Array to store client details ({ name, amount })
//       },
//       {
//         week: 'Week 2',
//         range: `${currentMonthName} 8 - ${currentMonthName} 14`,
//         _internal_start_date: new Date(Date.UTC(year, monthIndex, 8, 0, 0, 0, 0)),
//         _internal_end_date: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)),
//         amount: 0,
//         clients: []
//       },
//       {
//         week: 'Week 3',
//         range: `${currentMonthName} 15 - ${currentMonthName} 21`,
//         _internal_start_date: new Date(Date.UTC(year, monthIndex, 15, 0, 0, 0, 0)),
//         _internal_end_date: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)),
//         amount: 0,
//         clients: []
//       },
//       {
//         week: 'Week 4',
//         range: `${currentMonthName} 22 - ${currentMonthName} ${lastDayOfCurrentMonthNumber}`,
//         _internal_start_date: new Date(Date.UTC(year, monthIndex, 22, 0, 0, 0, 0)),
//         _internal_end_date: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)), // End of the last day
//         amount: 0,
//         clients: []
//       }
//     ];

//     // 3. Fetch Special Orders for the Entire Current Month
//     const firstDayOfMonth = baseWeeksDefinition[0]._internal_start_date;
//     const lastDayOfMonth = baseWeeksDefinition[3]._internal_end_date;

//     const ordersInMonth = await prisma.project_special_order.findMany({
//       where: {
//         created_date: {
//           gte: firstDayOfMonth,
//           lte: lastDayOfMonth,
//         },
//       },
//       select: {
//         special_order_amount: true,
//         created_date: true,
//         client_name: true, // Crucial for the report
//         profile: {
//           select: {
//             profile_name: true,
//           },
//         },
//       },
//     });

//     // 4. Process and Aggregate Orders by Profile and then by Custom Week
//     const reportDataByProfile = {};

//     ordersInMonth.forEach(order => {
//       if (
//         !order.profile ||
//         !order.profile.profile_name ||
//         !order.created_date ||
//         order.special_order_amount === null ||
//         order.special_order_amount === undefined
//       ) {
//         return; // Skip if essential data for this report is missing
//       }

//       const profileName = order.profile.profile_name;
//       const amount = parseFloat(order.special_order_amount);
//       const clientName = order.client_name ? order.client_name.trim() : null;

//       if (isNaN(amount) || !clientName || clientName === "") {
//         return; // Skip if amount is not a valid number or client name is missing/empty
//       }

//       const orderDate = new Date(order.created_date);

//       // Initialize for the profile if it's the first time encountered
//       if (!reportDataByProfile[profileName]) {
//         // Deep copy baseWeeksDefinition for this specific profile
//         reportDataByProfile[profileName] = baseWeeksDefinition.map(weekDef => ({
//           week: weekDef.week,
//           range: weekDef.range,
//           // Keep internal start/end dates for processing this profile's orders
//           _internal_start_date: weekDef._internal_start_date,
//           _internal_end_date: weekDef._internal_end_date,
//           target: weekDef.target, // Assuming target might exist elsewhere or is added later
//           amount: 0, // Ensure amount starts at 0 for this profile's week
//           clients: [] // Fresh array for this profile's week clients
//         }));
//       }

//       // Assign order to the correct week for this profile
//       for (const weekData of reportDataByProfile[profileName]) {
//         if (orderDate >= weekData._internal_start_date && orderDate <= weekData._internal_end_date) {
//           // Aggregate total amount for the week
//           weekData.amount += amount;

//           // Find if the client already exists in this week's client list
//           const existingClient = weekData.clients.find(client => client.name === clientName);

//           if (existingClient) {
//             // If client exists, add the amount
//             existingClient.amount += amount;
//           } else {
//             // If client does not exist, add a new client object
//             weekData.clients.push({ name: clientName, amount: amount });
//           }

//           break; // Order processed for one week
//         }
//       }
//     });

//     // 5. Finalize data: sort clients by name and remove internal date fields
//     for (const profileName in reportDataByProfile) {
//       reportDataByProfile[profileName].forEach(weekData => {
//         // Sort clients by name
//         weekData.clients.sort((a, b) => a.name.localeCompare(b.name));
        
//         // Clean up helper fields
//         delete weekData._internal_start_date;
//         delete weekData._internal_end_date;
//       });
//     }

//     // If you want to ensure all profiles (even those with no orders) are listed,
//     // you would fetch all profile names first, initialize reportDataByProfile for all of them,
//     // and then populate. For now, this only shows profiles with orders in the current month.

//     res.json({
//       currentYear: year,
//       currentMonth: currentMonthName,
//       report: reportDataByProfile,
//     });

//   } catch (error) {
//     console.error('Error generating profile current month weekly details:', error);
//     res.status(500).json({ error: 'Failed to generate current month weekly details report' });
//   }
// };

exports.getProfileCurrentMonthWeeklyDetails = async (req, res) => {
  try {
    // 1. Determine Current Year and Month
    const currentServerDate = new Date();
    const year = currentServerDate.getFullYear();
    const monthIndex = currentServerDate.getMonth(); // 0-indexed (e.g., January is 0, May is 4)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[monthIndex];

    // Calculate the last day of the current month for the range string
    const lastDayOfCurrentMonthNumber = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

    // 2. Define Week Structures
    // This base definition will be deep-copied for each profile.
    const baseWeeksDefinition = [
      {
        week: 'Week 1',
        range: `${currentMonthName} 1 - ${currentMonthName} 7`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 2',
        range: `${currentMonthName} 8 - ${currentMonthName} 14`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 8, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 3',
        range: `${currentMonthName} 15 - ${currentMonthName} 21`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 15, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 4',
        range: `${currentMonthName} 22 - ${currentMonthName} ${lastDayOfCurrentMonthNumber}`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 22, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)), // End of the last day
        amount: 0,
        clients: []
      }
    ];

    // 3. Fetch Special Orders for the Entire Current Month
    const firstDayOfMonth = baseWeeksDefinition[0]._internal_start_date;
    const lastDayOfMonth = baseWeeksDefinition[3]._internal_end_date;

    const ordersInMonth = await prisma.project_special_order.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      select: {
        special_order_amount: true,
        created_date: true,
        client_name: true, // Crucial for the report
        profile: {
          select: {
            profile_name: true,
          },
        },
      },
    });

    // 4. Process and Aggregate Orders
    const reportDataByProfile = {};
    let overallTotalSpecialOrderAmount = 0; // Initialize overall total amount
    const profileOrderStats = {}; // To store { totalOrders: 0, totalAmount: 0 } for each profile

    ordersInMonth.forEach(order => {
      if (
        !order.profile ||
        !order.profile.profile_name ||
        !order.created_date ||
        order.special_order_amount === null ||
        order.special_order_amount === undefined
      ) {
        console.warn('Skipping order due to missing essential data:', order);
        return;
      }

      const profileName = order.profile.profile_name;
      const amount = parseFloat(order.special_order_amount);
      const clientName = order.client_name ? order.client_name.trim() : null;

      if (isNaN(amount)) {
        console.warn(`Skipping order for profile ${profileName} due to invalid amount:`, order.special_order_amount);
        return;
      }
      
      if (!clientName || clientName === "") {
        // Client name is crucial for the weekly breakdown details.
        // If it's missing, we might still count it for overall/profile totals if requirements differ,
        // but for this report's structure, it's better to skip if client name is missing for weekly aggregation.
        console.warn(`Skipping order for profile ${profileName} due to missing client name (client name is required for weekly client breakdown).`);
        return;
      }

      // Update overall total amount
      overallTotalSpecialOrderAmount += amount;

      // Initialize and update profile-specific stats
      if (!profileOrderStats[profileName]) {
        profileOrderStats[profileName] = { totalOrders: 0, totalAmount: 0 };
      }
      profileOrderStats[profileName].totalOrders += 1;
      profileOrderStats[profileName].totalAmount += amount;

      const orderDate = new Date(order.created_date);

      // Initialize for the profile in reportDataByProfile if it's the first time encountered
      if (!reportDataByProfile[profileName]) {
        // Deep copy baseWeeksDefinition for this specific profile
        reportDataByProfile[profileName] = baseWeeksDefinition.map(weekDef => ({
          ...weekDef, // Spread to copy properties from baseWeeksDefinition
          // target: weekDef.target, // Uncomment if target is part of baseWeeksDefinition and needed
          amount: 0, // Ensure amount starts at 0 for this profile's week
          clients: [] // Fresh array for this profile's week clients
        }));
      }

      // Assign order to the correct week for this profile
      for (const weekData of reportDataByProfile[profileName]) {
        if (orderDate >= weekData._internal_start_date && orderDate <= weekData._internal_end_date) {
          // Aggregate total amount for the week
          weekData.amount += amount;

          // Find if the client already exists in this week's client list
          const existingClient = weekData.clients.find(client => client.name === clientName);

          if (existingClient) {
            // If client exists, add the amount
            existingClient.amount += amount;
          } else {
            // If client does not exist, add a new client object
            weekData.clients.push({ name: clientName, amount: amount });
          }
          break; // Order processed for one week
        }
      }
    });

    // 5. Finalize data: sort clients by name, remove internal date fields, and format profile summary
    for (const profileName in reportDataByProfile) {
      reportDataByProfile[profileName].forEach(weekData => {
        // Sort clients by name
        weekData.clients.sort((a, b) => a.name.localeCompare(b.name));
        
        // Clean up helper fields
        delete weekData._internal_start_date;
        delete weekData._internal_end_date;
      });
    }

    // Format profile summary for the response
    const profileSummaryForResponse = {};
    for (const profileName in profileOrderStats) {
      const stats = profileOrderStats[profileName];
      profileSummaryForResponse[profileName] = {
        "total special orders": stats.totalOrders, // Key as per your example
        "total amount": parseFloat(stats.totalAmount.toFixed(2)) // Key as per your example
      };
    }

    // If you want to ensure all profiles (even those with no orders) are listed in profileOrderSummary or report,
    // you would need to fetch all profile names first, initialize reportDataByProfile and profileOrderStats for all of them,
    // and then populate. Currently, only profiles with orders in the current month will appear.

    res.json({
      currentYear: year,
      currentMonth: currentMonthName,
      overallTotalSpecialOrderAmount: parseFloat(overallTotalSpecialOrderAmount.toFixed(2)),
      profileOrderSummary: profileSummaryForResponse,
      report: reportDataByProfile,
    });

  } catch (error) {
    console.error('Error generating profile current month weekly details:', error);
    res.status(500).json({ error: 'Failed to generate current month weekly details report' });
  }
};





// Presuming this code would be in a controller file, e.g., profileController.js

// You would import Prisma at the top of this file
// import prisma from '../lib/prisma'; // Adjust path as necessary

// exports.getProfileOverviewById = async (req, res) => {
//   try {
//     const { profileId } = req.params; // Assuming ID comes from route parameters like /api/profiles/:profileId

//     if (!profileId || isNaN(parseInt(profileId))) {
//       return res.status(400).json({ message: 'Valid Profile ID is required as a route parameter.' });
//     }

//     const id = parseInt(profileId);

//     const today = new Date();
//     const currentYear = today.getFullYear();
//     const currentMonth = today.getMonth();

//     const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
//     const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

//     const todayStart = new Date(currentYear, currentMonth, today.getDate(), 0, 0, 0, 0);
//     const todayEnd = new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59, 999);

//     // 1. Profile Name and Basic Info
//     const profile = await prisma.profile.findUnique({
//       where: { id: id },
//       include: {
//         department: true, // For category
//       },
//     });

//     if (!profile) {
//       return res.status(404).json({ message: 'Profile not found' });
//     }

//     // 2. Category (Department Name)
//     const categories = profile.department && profile.department.length > 0
//       ? profile.department.map(dep => dep.department_name).join(', ')
//       : 'N/A';

//     // 3. Total Earnings (All time delivered projects)
//     const totalEarningsResult = await prisma.project.aggregate({
//       _sum: {
//         after_fiverr_amount: true,
//         after_Fiverr_bonus: true,
//       },
//       where: {
//         profile_id: id,
//         is_delivered: true,
//         // status: 'Completed' // Consider if a 'Completed' status is more accurate
//       },
//     });
//     // Ensure conversion to Number before arithmetic and toFixed
//     const sumOfTotalEarnings = (Number(totalEarningsResult._sum.after_fiverr_amount) || 0) + (Number(totalEarningsResult._sum.after_Fiverr_bonus) || 0);

//     // 4. Promotion Amount (Today's Date)
//     const todaysPromotion = await prisma.profile_promotion.findFirst({
//       where: {
//         profile_id: id,
//         created_date: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//       },
//       orderBy: {
//         created_date: 'desc',
//       },
//     });
//     // promotion_amount is Decimal?, convert to Number
//     const promotionAmountTodayValue = todaysPromotion ? Number(todaysPromotion.promotion_amount) : 0;

//     // 5. This Month's Special Orders (Count)
//     const thisMonthSpecialOrdersCount = await prisma.project_special_order.count({
//       where: {
//         profile_id: id,
//         created_date: { // Assuming this date field determines "this month's"
//           gte: firstDayOfMonth,
//           lte: lastDayOfMonth,
//         },
//       },
//     });

//     // 6. This Month's Earnings (Delivered this month)
//     const thisMonthEarningsResult = await prisma.project.aggregate({
//       _sum: {
//         after_fiverr_amount: true,
//         after_Fiverr_bonus: true,
//       },
//       where: {
//         profile_id: id,
//         is_delivered: true,
//         delivery_date: {
//           gte: firstDayOfMonth,
//           lte: lastDayOfMonth,
//         },
//       },
//     });
//     // Ensure conversion to Number before arithmetic and toFixed
//     const sumOfThisMonthEarnings = (Number(thisMonthEarningsResult._sum.after_fiverr_amount) || 0) + (Number(thisMonthEarningsResult._sum.after_Fiverr_bonus) || 0);

//     // 7. Rank Keywords (Today's Keywords)
//     const todaysRankingEntry = await prisma.profile_ranking.findFirst({
//       where: {
//         profile_id: id,
//         created_date: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//       },
//       orderBy: {
//         created_date: 'desc',
//       },
//     });
//     const rankKeywordsToday = todaysRankingEntry ? todaysRankingEntry.keywords : 'N/A';

//     // 8. Total Projects
//     const totalProjectsCount = await prisma.project.count({
//       where: {
//         profile_id: id,
//       },
//     });

//     // 9. Average Rating
//     let averageRating = 0;
//     // profile.total_rating and profile.complete_count are Decimal? and Int? respectively
//     if (profile.total_rating !== null && profile.complete_count !== null && Number(profile.complete_count) > 0) {
//         averageRating = Number(profile.total_rating) / Number(profile.complete_count);
//     } else {
//         const ratingAggregation = await prisma.project.aggregate({
//             _sum: { rating: true }, // rating is Int?
//             _count: { rating: true },
//             where: {
//                 profile_id: id,
//                 is_delivered: true,
//                 rating: { not: null }
//             }
//         });
//         if (ratingAggregation._count.rating > 0) {
//             averageRating = (Number(ratingAggregation._sum.rating) || 0) / ratingAggregation._count.rating;
//         }
//     }

//     // 10. Current Ranking (Today's Ranking Page and Row)
//     const currentRankingInfo = todaysRankingEntry
//         ? `Page: ${todaysRankingEntry.ranking_page || 'N/A'}, Row: ${todaysRankingEntry.row || 'N/A'}`
//         : 'N/A';

//     // 11. Total Cancelled
//     const totalCancelledCount = await prisma.project.count({
//       where: {
//         profile_id: id,
//         status: 'cancelled', // Ensure 'cancelled' is the exact status string
//       },
//     });

//     const permission = profile.role || "N/A"; // Assuming a 'role' field for permission

//     const profileOverview = {
//       profileId: profile.id,
//       profileName: profile.profile_name,
//       category: categories,
//       permission: permission,
//       totalEarnings: parseFloat(sumOfTotalEarnings.toFixed(2)),
//       // Removed totalSettedPromotionName and promotionStatus as per request
//       promotionAmountToday: promotionAmountTodayValue > 0 ? parseFloat(promotionAmountTodayValue.toFixed(2)) : "N/A",
//       thisMonthSpecialOrdersCount,
//       thisMonthEarnings: parseFloat(sumOfThisMonthEarnings.toFixed(2)),
//       rankKeywordsToday,
//       totalProjectsCount,
//       averageRating: averageRating > 0 ? parseFloat(averageRating.toFixed(2)) : "N/A",
//       currentRanking: currentRankingInfo,
//       totalCancelledCount,
//     };

//     return res.status(200).json({ message: 'Profile overview retrieved successfully', data: profileOverview });

//   } catch (error) {
//     console.error(`Error fetching profile overview for ID ${req.params.profileId}:`, error);
//     // In development, you might want to send the full error, otherwise a generic message
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//     return res.status(500).json({
//       message: 'Failed to retrieve profile overview',
//       error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
//     });
//   }
// };




exports.getProfileOverviewById = async (req, res) => {
  try {
    const { profileId } = req.params; // Assuming ID comes from route parameters like /api/profiles/:profileId

    if (!profileId || isNaN(parseInt(profileId))) {
      return res.status(400).json({ message: 'Valid Profile ID is required as a route parameter.' });
    }

    const id = parseInt(profileId);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Setting the date to the last day of the current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999); // Include end of the day

    const todayStart = new Date(currentYear, currentMonth, today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59, 999);

    // 1. Profile Name and Basic Info
    const profile = await prisma.profile.findUnique({
      where: { id: id },
      include: {
        department: true, // For category
      },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // 2. Category (Department Name)
    const categories = profile.department && profile.department.length > 0
      ? profile.department.map(dep => dep.department_name).join(', ')
      : 'N/A';

    // 3. Total Earnings (All time delivered projects)
    const totalEarningsResult = await prisma.project.aggregate({
      _sum: {
        after_fiverr_amount: true,
        after_Fiverr_bonus: true,
      },
      where: {
        profile_id: id,
        is_delivered: true,
        // status: 'Completed' // Consider if a 'Completed' status is more accurate
      },
    });
    // Ensure conversion to Number before arithmetic and toFixed
    const sumOfTotalEarnings = (Number(totalEarningsResult._sum.after_fiverr_amount) || 0) + (Number(totalEarningsResult._sum.after_Fiverr_bonus) || 0);

    // 4. Promotion Amount (Today's Date)
    const todaysPromotion = await prisma.profile_promotion.findFirst({
      where: {
        profile_id: id,
        created_date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        created_date: 'desc',
      },
    });
    // promotion_amount is Decimal?, convert to Number
    const promotionAmountTodayValue = todaysPromotion ? Number(todaysPromotion.promotion_amount) : 0;

    // 5. This Month's Special Orders (Count and Amount)
    const thisMonthSpecialOrdersCount = await prisma.project_special_order.count({
      where: {
        profile_id: id,
        created_date: { // Assuming this date field determines "this month's"
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    // Corrected: Using 'special_order_amount' based on your schema
    const thisMonthSpecialOrdersAmountResult = await prisma.project_special_order.aggregate({
        _sum: {
            special_order_amount: true, // <-- Corrected field name
        },
        where: {
            profile_id: id,
            created_date: {
                gte: firstDayOfMonth,
                lte: lastDayOfMonth,
            },
        },
    });
    console.log('thisMonthSpecialOrdersAmountResult:', thisMonthSpecialOrdersAmountResult);
    const thisMonthSpecialOrdersAmount = Number(thisMonthSpecialOrdersAmountResult._sum.special_order_amount) || 0;


    // 6. This Month's Earnings (Delivered this month)
    const thisMonthEarningsResult = await prisma.project.aggregate({
      _sum: {
        after_fiverr_amount: true,
        after_Fiverr_bonus: true,
      },
      where: {
        profile_id: id,
        is_delivered: true,
        delivery_date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });
    // Ensure conversion to Number before arithmetic and toFixed
    const sumOfThisMonthEarnings = (Number(thisMonthEarningsResult._sum.after_fiverr_amount) || 0) + (Number(thisMonthEarningsResult._sum.after_Fiverr_bonus) || 0);

    // 7. Rank Keywords (Today's Keywords)
    const todaysRankingEntry = await prisma.profile_ranking.findFirst({
      where: {
        profile_id: id,
        created_date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        created_date: 'desc',
      },
    });
    const rankKeywordsToday = todaysRankingEntry ? todaysRankingEntry.keywords : 'N/A';

    // 8. Total Projects
    const totalProjectsCount = await prisma.project.count({
      where: {
        profile_id: id,
      },
    });

    // 9. Average Rating
    let averageRating = 0;
    // profile.total_rating and profile.complete_count are Decimal? and Int? respectively
    if (profile.total_rating !== null && profile.complete_count !== null && Number(profile.complete_count) > 0) {
        averageRating = Number(profile.total_rating) / Number(profile.complete_count);
    } else {
        const ratingAggregation = await prisma.project.aggregate({
            _sum: { rating: true }, // rating is Int?
            _count: { rating: true },
            where: {
                profile_id: id,
                is_delivered: true,
                rating: { not: null }
            }
        });
        if (ratingAggregation._count.rating > 0) {
            averageRating = (Number(ratingAggregation._sum.rating) || 0) / ratingAggregation._count.rating;
        }
    }

    // 10. Current Ranking (Today's Ranking Page and Row)
    const currentRankingInfo = todaysRankingEntry
        ? `Page: ${todaysRankingEntry.ranking_page || 'N/A'}, Row: ${todaysRankingEntry.row || 'N/A'}`
        : 'N/A';

    // 11. Total Cancelled
    const totalCancelledCount = await prisma.project.count({
      where: {
        profile_id: id,
        status: 'cancelled', // Ensure 'cancelled' is the exact status string
      },
    });

    // Removed permission as requested


    const profileOverview = {
      profileId: profile.id,
      profileName: profile.profile_name,
      category: categories,
      totalEarnings: parseFloat(sumOfTotalEarnings.toFixed(2)),
      promotionAmountToday: promotionAmountTodayValue > 0 ? parseFloat(promotionAmountTodayValue.toFixed(2)) : "N/A",
      thisMonthSpecialOrdersCount,
      thisMonthSpecialOrdersAmount: parseFloat(thisMonthSpecialOrdersAmount.toFixed(2)), // Added amount with correct field name
      thisMonthEarnings: parseFloat(sumOfThisMonthEarnings.toFixed(2)),
      rankKeywordsToday,
      totalProjectsCount,
      averageRating: averageRating > 0 ? parseFloat(averageRating.toFixed(2)) : "N/A",
      currentRanking: currentRankingInfo,
      totalCancelledCount,
    };

    return res.status(200).json({ message: 'Profile overview retrieved successfully', data: profileOverview });

  } catch (error) {
    console.error(`Error fetching profile overview for ID ${req.params.profileId}:`, error);
    // In development, you might want to send the full error, otherwise a generic message
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({
      message: 'Failed to retrieve profile overview',
      error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
    });
  }
};