const { de } = require('@faker-js/faker');
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
        status: 'nra', // Default status, can be changed later
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
  const { profileName, special_order_amount, delivery_date, client_name,status } = req.body;

  try {
    if(status =='delivered'){
      // If status is 'delivered', set delivery_date to today's date
      delivery_date = new Date();
    }
    const dataForUpdate = {
      // Initialize with the fields that can be updated
      status: status || 'nra', // Default to 'nra' if not provided
      delivery_date: delivery_date || null,
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
    //if exists,  frist unlink the profile_id
    const specialOrder = await prisma.project_special_order.findUnique({
      where: { id: parseInt(id) },
    });
    if (!specialOrder) {
      return res.status(404).json({ message: `Special order with ID ${id} not found.` });
    }
    // If the special order has a profile_id, you might want to unlink it first
    if (specialOrder.profile_id) {
      await prisma.project_special_order.update({
        where: { id: parseInt(id) },
        data: { profile_id: null }, // Unlink the profile_id
      });
    }
    // Now delete the special order
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

// Helper function to get all months in a quarter
function getMonthsInQuarter(quarter) {
  switch (quarter) {
    case 1: return [0, 1, 2]; // Jan, Feb, Mar
    case 2: return [3, 4, 5]; // Apr, May, Jun
    case 3: return [6, 7, 8]; // Jul, Aug, Sep
    case 4: return [9, 10, 11]; // Oct, Nov, Dec
    default: throw new Error('Invalid quarter');
  }
}

// Helper function to get month name
function getMonthName(monthIndex) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[monthIndex];
}

// Helper function to get number of days in a month
function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Helper function to generate week ranges for a month
function generateWeeklyBreakdown(year, monthIndex, monthlyTarget, monthlyAchievement, memberId, teamId, department) {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const monthName = getMonthName(monthIndex);
  
  // Calculate weekly target (monthly target divided by number of weeks)
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  const weeklyTarget = monthlyTarget / weeksInMonth;
  
  const weeks = [];
  let weekNumber = 1;
  
  for (let startDay = 1; startDay <= daysInMonth; startDay += 7) {
    const endDay = Math.min(startDay + 6, daysInMonth);
    
    weeks.push({
      week: `Week ${weekNumber}`,
      range: `${monthName} ${startDay} - ${monthName} ${endDay}`,
      target: weeklyTarget,
      achieved: 0, // Will be calculated separately
      difference: 0, // Will be calculated after achievement
      startDate: new Date(Date.UTC(year, monthIndex, startDay, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(year, monthIndex, endDay, 23, 59, 59, 999))
    });
    
    weekNumber++;
  }
  
  return weeks;
}

// Helper function to calculate weekly achievements
async function calculateWeeklyAchievements(weeks, memberId, teamId, department) {
  for (const week of weeks) {
    let weeklyAchievement = 0;
    
    if (department?.toLowerCase() === 'sales') {
      if (memberId) {
        // Sales member achievement: ordered projects by this member
        const orderedProjects = await prisma.project.findMany({
          where: {
            date: {
              gte: week.startDate,
              lte: week.endDate,
            },
            ordered_by: memberId
          },
          select: { order_amount: true }
        });

        weeklyAchievement = orderedProjects.reduce((sum, project) => {
          return sum + (parseFloat(project.order_amount) || 0);
        }, 0);
      } else if (teamId) {
        // Sales team achievement: ordered projects by team members
        const orderedProjects = await prisma.project.findMany({
          where: {
            date: {
              gte: week.startDate,
              lte: week.endDate,
            },
            team_member: {
              team_id: teamId
            }
          },
          select: { order_amount: true }
        });

        weeklyAchievement = orderedProjects.reduce((sum, project) => {
          return sum + (parseFloat(project.order_amount) || 0);
        }, 0);
      }
    } else {
      if (memberId) {
        // Non-sales member achievement: Check member_distribution first
        const memberDistributions = await prisma.member_distribution.findMany({
          where: {
            team_member_id: memberId,
            project: {
              delivery_date: {
                gte: week.startDate,
                lte: week.endDate,
              },
              is_delivered: true
            }
          },
          select: { amount: true }
        });

        if (memberDistributions.length > 0) {
          weeklyAchievement = memberDistributions.reduce((sum, distribution) => {
            return sum + (parseFloat(distribution.amount) || 0);
          }, 0);
        } else {
          // Fallback: calculate based on team projects divided by team members
          const teamDeliveredProjects = await prisma.project.findMany({
            where: {
              delivery_date: {
                gte: week.startDate,
                lte: week.endDate,
              },
              is_delivered: true,
              team_id: teamId
            },
            select: { 
              after_fiverr_amount: true, 
              after_Fiverr_bonus: true 
            }
          });

          const teamMemberCount = await prisma.team_member.count({
            where: { team_id: teamId }
          });

          const teamTotalAchievement = teamDeliveredProjects.reduce((sum, project) => {
            const afterFiverr = parseFloat(project.after_fiverr_amount) || 0;
            const bonus = parseFloat(project.after_Fiverr_bonus) || 0;
            return sum + afterFiverr + bonus;
          }, 0);

          weeklyAchievement = teamMemberCount > 0 ? teamTotalAchievement / teamMemberCount : 0;
        }
      } else if (teamId) {
        // Non-sales team achievement: delivered projects
        const deliveredProjects = await prisma.project.findMany({
          where: {
            delivery_date: {
              gte: week.startDate,
              lte: week.endDate,
            },
            is_delivered: true,
            team_id: teamId
          },
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true }
        });

        weeklyAchievement = deliveredProjects.reduce((sum, project) => {
          const afterFiverr = parseFloat(project.after_fiverr_amount) || 0;
          const bonus = parseFloat(project.after_Fiverr_bonus) || 0;
          return sum + afterFiverr + bonus;
        }, 0);
      }
    }
    
    week.achieved = weeklyAchievement;
    week.difference = weeklyAchievement - week.target;
    
    // Remove internal date fields
    delete week.startDate;
    delete week.endDate;
  }
  
  return weeks;
}

// API endpoint handler to get quarterly performance based on user role
exports.getQuarterlyPerformance = async (req, res) => {
  let user;
  try {
    // Fetch user details from the database using the uid from the authenticated request
    if (!req.user || !req.user.uid) {
      console.log('Authentication failed: req.user or req.user.uid is missing.');
      return res.status(401).json({ error: 'Unauthorized: Authentication data missing' });
    }

    user = await prisma.team_member.findUnique({
      where: { uid: req.user.uid },
      include: {
        team: true,
        department: true
      }
    });
    console.log('User details fetched:', user);

  } catch (fetchUserError) {
    console.error('Error fetching user details from DB:', fetchUserError);
    return res.status(500).json({ error: 'Internal server error fetching user data' });
  }

  if (!user) {
    console.log('User not found in database');
    return res.status(401).json({ error: 'User not found' });
  }

  const userRole = user?.role?.toLowerCase();
  const userId = user?.id;
  const userTeamId = user?.team_id;

  console.log('User Role:', userRole);
  console.log('User ID:', userId);
  console.log('User Team ID:', userTeamId);

  // Get quarter and year from query params or default to current
  let targetYear, targetQuarter;

  if (req.query.year && req.query.quarter) {
    const queryYear = parseInt(req.query.year);
    const queryQuarter = parseInt(req.query.quarter);
    
    if (!isNaN(queryYear) && !isNaN(queryQuarter) && queryQuarter >= 1 && queryQuarter <= 4) {
      targetYear = queryYear;
      targetQuarter = queryQuarter;
    } else {
      const { year, quarter } = getCurrentQuarterAndYear();
      targetYear = year;
      targetQuarter = quarter;
    }
  } else {
    const { year, quarter } = getCurrentQuarterAndYear();
    targetYear = year;
    targetQuarter = quarter;
  }

  console.log(`Working on data for Quarter ${targetQuarter}, Year ${targetYear}`);

  const { startDate, endDate } = getQuarterDates(targetYear, targetQuarter);
  const quarterMonths = getMonthsInQuarter(targetQuarter);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  try {
    let responseData = {
      quarter: targetQuarter,
      year: targetYear,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };

    // Helper function to calculate monthly data for a team
    const calculateTeamMonthlyData = async (teamId) => {
      const monthlyData = [];
      
      for (const monthIndex of quarterMonths) {
        const monthYear = targetYear;
        const monthStart = new Date(Date.UTC(monthYear, monthIndex, 1));
        const monthEnd = new Date(Date.UTC(monthYear, monthIndex + 1, 0, 23, 59, 59, 999));
        const isCurrentMonth = (monthYear === currentYear && monthIndex === currentMonth);
        const isFutureMonth = (monthYear > currentYear || (monthYear === currentYear && monthIndex > currentMonth));

        let monthlyTarget = 0;
        let monthlyAchievement = 0;

        // Get team info for department checking
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: { department: true }
        });

        if (isFutureMonth) {
          // Future month - target is 0
          monthlyTarget = 0;
        } else if (isCurrentMonth) {
          // Current month - use current team member targets
          const currentTeamMembers = await prisma.team_member.findMany({
            where: { team_id: teamId },
            select: { target: true }
          });

          monthlyTarget = currentTeamMembers.reduce((sum, member) => {
            return sum + (parseFloat(member.target) || 0);
          }, 0);
        } else {
          // Past month - use history table
          const historyRecords = await prisma.TeamMemberTargetHistory.findMany({
            where: {
              team_id: teamId,
              start_date: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
            select: { target_amount: true }
          });

          monthlyTarget = historyRecords.reduce((sum, record) => {
            return sum + (parseFloat(record.target_amount) || 0);
          }, 0);
        }

        // Calculate achievement based on department
        if (team?.department?.department_name?.toLowerCase() === 'sales') {
          // Sales achievement: ordered projects
          const orderedProjects = await prisma.project.findMany({
            where: {
              date: {
                gte: monthStart,
                lte: monthEnd,
              },
              team_member: {
                team_id: teamId
              }
            },
            select: { order_amount: true }
          });

          monthlyAchievement = orderedProjects.reduce((sum, project) => {
            return sum + (parseFloat(project.order_amount) || 0);
          }, 0);
        } else {
          // Non-sales achievement: delivered projects
          const deliveredProjects = await prisma.project.findMany({
            where: {
              delivery_date: {
                gte: monthStart,
                lte: monthEnd,
              },
              is_delivered: true,
              team_id: teamId
            },
            select: { after_fiverr_amount: true, after_Fiverr_bonus: true }
          });

          monthlyAchievement = deliveredProjects.reduce((sum, project) => {
            const afterFiverr = parseFloat(project.after_fiverr_amount) || 0;
            const bonus = parseFloat(project.after_Fiverr_bonus) || 0;
            return sum + afterFiverr + bonus;
          }, 0);
        }

        // Generate weekly breakdown
        const weeklyBreakdown = generateWeeklyBreakdown(
          targetYear, 
          monthIndex, 
          monthlyTarget, 
          monthlyAchievement, 
          null, 
          teamId, 
          team?.department?.department_name
        );

        const weeklyData = await calculateWeeklyAchievements(
          weeklyBreakdown, 
          null, 
          teamId, 
          team?.department?.department_name
        );

        monthlyData.push({
          month: getMonthName(monthIndex),
          monthIndex: monthIndex + 1,
          target: monthlyTarget,
          achieved: monthlyAchievement,
          difference: monthlyAchievement - monthlyTarget,
          weeklyBreakdown: weeklyData
        });
      }

      return monthlyData;
    };

    // Helper function to calculate team quarterly target and achievement
    const calculateTeamQuarterlyData = async (teamId) => {
      const monthlyData = await calculateTeamMonthlyData(teamId);
      
      const totalTarget = monthlyData.reduce((sum, month) => sum + month.target, 0);
      const totalAchievement = monthlyData.reduce((sum, month) => sum + month.achieved, 0);

      return {
        totalTarget,
        totalAchievement,
        difference: totalAchievement - totalTarget,
        monthlyBreakdown: monthlyData
      };
    };

    // Helper function to calculate monthly data for a member
    const calculateMemberMonthlyData = async (memberId) => {
      const monthlyData = [];

      // Get current member with department info
      const currentMember = await prisma.team_member.findUnique({
        where: { id: memberId },
        include: { department: true, team: true }
      });

      for (const monthIndex of quarterMonths) {
        const monthYear = targetYear;
        const monthStart = new Date(Date.UTC(monthYear, monthIndex, 1));
        const monthEnd = new Date(Date.UTC(monthYear, monthIndex + 1, 0, 23, 59, 59, 999));
        const isCurrentMonth = (monthYear === currentYear && monthIndex === currentMonth);
        const isFutureMonth = (monthYear > currentYear || (monthYear === currentYear && monthIndex > currentMonth));

        let monthlyTarget = 0;
        let monthlyAchievement = 0;

        if (isFutureMonth) {
          // Future month - target is 0
          monthlyTarget = 0;
        } else if (isCurrentMonth) {
          // Current month - use current target
          monthlyTarget = parseFloat(currentMember?.target) || 0;
        } else {
          // Past month - use history table
          const historyRecord = await prisma.TeamMemberTargetHistory.findFirst({
            where: {
              team_member_id: memberId,
              start_date: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
            select: { target_amount: true }
          });

          monthlyTarget = parseFloat(historyRecord?.target_amount) || 0;
        }

        // Calculate achievement based on department
        if (currentMember?.department?.department_name?.toLowerCase() === 'sales') {
          // Sales achievement: ordered projects by this member
          const orderedProjects = await prisma.project.findMany({
            where: {
              date: {
                gte: monthStart,
                lte: monthEnd,
              },
              ordered_by: memberId
            },
            select: { order_amount: true }
          });

          monthlyAchievement = orderedProjects.reduce((sum, project) => {
            return sum + (parseFloat(project.order_amount) || 0);
          }, 0);
        } else {
          // Non-sales achievement: Check member_distribution first
          const memberDistributions = await prisma.member_distribution.findMany({
            where: {
              team_member_id: memberId,
              project: {
                delivery_date: {
                  gte: monthStart,
                  lte: monthEnd,
                },
                is_delivered: true
              }
            },
            select: { amount: true }
          });

          if (memberDistributions.length > 0) {
            monthlyAchievement = memberDistributions.reduce((sum, distribution) => {
              return sum + (parseFloat(distribution.amount) || 0);
            }, 0);
          } else {
            // Fallback: calculate based on team projects
            const teamDeliveredProjects = await prisma.project.findMany({
              where: {
                delivery_date: {
                  gte: monthStart,
                  lte: monthEnd,
                },
                is_delivered: true,
                team_id: currentMember?.team_id
              },
              select: { 
                after_fiverr_amount: true, 
                after_Fiverr_bonus: true 
              }
            });

            const teamMemberCount = await prisma.team_member.count({
              where: { team_id: currentMember?.team_id }
            });

            const teamTotalAchievement = teamDeliveredProjects.reduce((sum, project) => {
              const afterFiverr = parseFloat(project.after_fiverr_amount) || 0;
              const bonus = parseFloat(project.after_Fiverr_bonus) || 0;
              return sum + afterFiverr + bonus;
            }, 0);

            monthlyAchievement = teamMemberCount > 0 ? teamTotalAchievement / teamMemberCount : 0;
          }
        }

        // Generate weekly breakdown
        const weeklyBreakdown = generateWeeklyBreakdown(
          targetYear, 
          monthIndex, 
          monthlyTarget, 
          monthlyAchievement, 
          memberId, 
          currentMember?.team_id, 
          currentMember?.department?.department_name
        );

        const weeklyData = await calculateWeeklyAchievements(
          weeklyBreakdown, 
          memberId, 
          currentMember?.team_id, 
          currentMember?.department?.department_name
        );

        monthlyData.push({
          month: getMonthName(monthIndex),
          monthIndex: monthIndex + 1,
          target: monthlyTarget,
          achieved: monthlyAchievement,
          difference: monthlyAchievement - monthlyTarget,
          weeklyBreakdown: weeklyData
        });
      }

      return monthlyData;
    };

    // Helper function to calculate member quarterly data
    const calculateMemberQuarterlyData = async (memberId) => {
      const monthlyData = await calculateMemberMonthlyData(memberId);
      
      const totalTarget = monthlyData.reduce((sum, month) => sum + month.target, 0);
      const totalAchievement = monthlyData.reduce((sum, month) => sum + month.achieved, 0);

      return {
        totalTarget,
        totalAchievement,
        difference: totalAchievement - totalTarget,
        monthlyBreakdown: monthlyData
      };
    };

    // Role-based data fetching
    if (userRole?.startsWith('hod_')) {
      // HOD: See all teams quarterly performance
      console.log('Role: HOD. Fetching all teams quarterly performance.');

      const allTeams = await prisma.team.findMany({
        select: {
          id: true,
          team_name: true,
        },
      });

      const allTeamsQuarterly = [];

      for (const team of allTeams) {
        const teamData = await calculateTeamQuarterlyData(team.id);
        allTeamsQuarterly.push({
          team_id: team.id,
          team_name: team.team_name,
          target: teamData.totalTarget,
          achieved: teamData.totalAchievement,
          difference: teamData.difference,
          monthlyBreakdown: teamData.monthlyBreakdown,
        });
      }

      responseData.allTeamsQuarterly = allTeamsQuarterly;

    } else if (userRole?.endsWith('_leader')) {
      // Leader: See own and team quarterly performance
      console.log('Role: Leader. Fetching own and team quarterly performance.');

      // Own performance
      const ownData = await calculateMemberQuarterlyData(userId);
      responseData.ownQuarterlyPerformance = {
        target: ownData.totalTarget,
        achieved: ownData.totalAchievement,
        difference: ownData.difference,
        monthlyBreakdown: ownData.monthlyBreakdown,
      };

      // Team performance (if leader has a team)
      if (userTeamId) {
        const teamData = await calculateTeamQuarterlyData(userTeamId);
        responseData.teamQuarterlyPerformance = {
          team_id: userTeamId,
          team_name: user.team?.team_name || 'Unknown Team',
          target: teamData.totalTarget,
          achieved: teamData.totalAchievement,
          difference: teamData.difference,
          monthlyBreakdown: teamData.monthlyBreakdown,
        };

        // Team members performance
        const teamMembers = await prisma.team_member.findMany({
          where: { team_id: userTeamId },
          select: {
            id: true,
            first_name: true,
            last_name: true,
          }
        });

        const teamMembersQuarterly = [];
        for (const member of teamMembers) {
          const memberData = await calculateMemberQuarterlyData(member.id);
          teamMembersQuarterly.push({
            team_member_id: member.id,
            team_member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
            target: memberData.totalTarget,
            achieved: memberData.totalAchievement,
            difference: memberData.difference,
            monthlyBreakdown: memberData.monthlyBreakdown,
          });
        }

        responseData.teamMembersQuarterly = teamMembersQuarterly;
      }

    } else if (userRole?.endsWith('_member')) {
      // Member: See only own quarterly performance
      console.log('Role: Member. Fetching own quarterly performance.');

      const ownData = await calculateMemberQuarterlyData(userId);
      responseData.ownQuarterlyPerformance = {
        target: ownData.totalTarget,
        achieved: ownData.totalAchievement,
        difference: ownData.difference,
        monthlyBreakdown: ownData.monthlyBreakdown,
      };

    } else {
      console.log(`Access denied for role: ${userRole}`);
      return res.status(403).json({ error: 'Access denied for this role.' });
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching quarterly performance:', error);
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

const previousMonthDateRange = () => {
  const now = new Date();
  const startOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
  const endOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
  return { startOfLastMonth, endOfLastMonth };
};

// const getDaysInMonth = (year, month) => {
//     return new Date(year, month + 1, 0).getDate();
// };

const getDayDateRange = (dayOffset = 0) => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() - dayOffset);
  
  const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
  
  return { startOfDay, endOfDay };
};

exports.getAllConsolidatedReports = async (req, res) => {
  try {
    // Check if custom month and year are provided
    const { month, year } = req.query;
    let startOfMonth, endOfMonth;
    let isCurrentMonth = true;
    let searchYear, searchMonth;

    if (month) {
      // Parse month name to get the correct month
      const monthNames = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };

      const monthName = month.toLowerCase();
      const monthIndex = monthNames[monthName];
      
      if (monthIndex === undefined) {
        return res.status(400).json({ 
          error: 'Invalid month name. Please use full month names like "january", "february", etc.' 
        });
      }

      // Use provided year or current year as fallback
      const providedYear = year ? parseInt(year) : new Date().getFullYear();
      
      // Validate year
      if (year && (isNaN(providedYear) || providedYear < 1900 || providedYear > 2100)) {
        return res.status(400).json({ 
          error: 'Invalid year. Please provide a valid year between 1900 and 2100.' 
        });
      }

      searchYear = providedYear;
      searchMonth = monthIndex;
      
      // Set start and end of the specified month and year
      startOfMonth = new Date(Date.UTC(searchYear, searchMonth, 1, 0, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(searchYear, searchMonth + 1, 0, 23, 59, 59, 999));
      
      // Check if this is current month and year
      const now = new Date();
      isCurrentMonth = (searchYear === now.getFullYear() && searchMonth === now.getMonth());
    } else {
      // Use current month date range
      const monthRanges = getMonthDateRange();
      startOfMonth = monthRanges.startOfMonth;
      endOfMonth = monthRanges.endOfMonth;
      
      const now = new Date();
      searchYear = now.getFullYear();
      searchMonth = now.getMonth();
    }

    console.log('Start of month:', startOfMonth);
    console.log('End of month:', endOfMonth);
    console.log('Search Year:', searchYear);
    console.log('Search Month:', searchMonth);
    console.log('Is current month:', isCurrentMonth);
    
    const SALES_DEPARTMENT_NAME = 'sales'; // Or from config

    const reports = {};

    // Calculate days in search month for daily target estimation
    const daysInSearchMonth = getDaysInMonth(searchYear, searchMonth);
    
    // Get current day of month to calculate per-day reports (for current month) or use last day for previous months
    const currentDayOfMonth = isCurrentMonth ? new Date().getDate() : daysInSearchMonth;

    // --- Profile Overview Section ---
    // Get all profiles for overview
    const allProfiles = await prisma.profile.findMany({
      include: {
        department: true,
      },
    });

    const profileOverviewData = [];

    for (const profile of allProfiles) {
      const id = profile.id;
      
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

      const todayStart = new Date(currentYear, currentMonth, today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(currentYear, currentMonth, today.getDate(), 23, 59, 59, 999);

      // Category (Department Name)
      const categories = profile.department && profile.department.length > 0
        ? profile.department.map(dep => dep.department_name).join(', ')
        : 'N/A';

      // Total Earnings (All time delivered projects)
      const totalEarningsResult = await prisma.project.aggregate({
        _sum: {
          after_fiverr_amount: true,
          after_Fiverr_bonus: true,
        },
        where: {
          profile_id: id,
          is_delivered: true,
        },
      });
      const sumOfTotalEarnings = (Number(totalEarningsResult._sum.after_fiverr_amount) || 0) + (Number(totalEarningsResult._sum.after_Fiverr_bonus) || 0);

      // Promotion Amount (Today's Date)
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
      const promotionAmountTodayValue = todaysPromotion ? Number(todaysPromotion.promotion_amount) : 0;

      // This Month's Special Orders (Count and Amount)
      const thisMonthSpecialOrdersCount = await prisma.project_special_order.count({
        where: {
          profile_id: id,
          created_date: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });

      const thisMonthSpecialOrdersAmountResult = await prisma.project_special_order.aggregate({
        _sum: {
          special_order_amount: true,
        },
        where: {
          profile_id: id,
          created_date: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });
      const thisMonthSpecialOrdersAmount = Number(thisMonthSpecialOrdersAmountResult._sum.special_order_amount) || 0;

      // This Month's Earnings (Delivered this month)
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
      const sumOfThisMonthEarnings = (Number(thisMonthEarningsResult._sum.after_fiverr_amount) || 0) + (Number(thisMonthEarningsResult._sum.after_Fiverr_bonus) || 0);

      // Today's Earnings (Delivered today)
      const todaysEarningsResult = await prisma.project.aggregate({
        _sum: {
          after_fiverr_amount: true,
          after_Fiverr_bonus: true,
        },
        where: {
          profile_id: id,
          is_delivered: true,
          delivery_date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });
      const sumOfTodaysEarnings = (Number(todaysEarningsResult._sum.after_fiverr_amount) || 0) + (Number(todaysEarningsResult._sum.after_Fiverr_bonus) || 0);

      // Rank Keywords (Today's Keywords)
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

      // Total Projects
      const totalProjectsCount = await prisma.project.count({
        where: {
          profile_id: id,
        },
      });

      // Average Rating
      let averageRating = 0;
      if (profile.total_rating !== null && profile.complete_count !== null && Number(profile.complete_count) > 0) {
        averageRating = Number(profile.total_rating) / Number(profile.complete_count);
      } else {
        const ratingAggregation = await prisma.project.aggregate({
          _sum: { rating: true },
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

      // Current Ranking (Today's Ranking Page and Row)
      const currentRankingInfo = todaysRankingEntry
        ? `Page: ${todaysRankingEntry.ranking_page || 'N/A'}, Row: ${todaysRankingEntry.row || 'N/A'}`
        : 'N/A';

      // Total Cancelled
      const totalCancelledCount = await prisma.project.count({
        where: {
          profile_id: id,
          status: 'cancelled',
        },
      });

      // Daily breakdown for this profile (last 7 days)
      const dailyBreakdown = [];
      for (let i = 6; i >= 0; i--) {
        const { startOfDay, endOfDay } = getDayDateRange(i);
        
        const dailyEarnings = await prisma.project.aggregate({
          _sum: {
            after_fiverr_amount: true,
            after_Fiverr_bonus: true,
          },
          where: {
            profile_id: id,
            is_delivered: true,
            delivery_date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });
        
        const dailyPromotion = await prisma.profile_promotion.aggregate({
          _sum: {
            promotion_amount: true,
            actual_increase: true,
          },
          where: {
            profile_id: id,
            created_date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        const dailySpecialOrders = await prisma.project_special_order.aggregate({
          _sum: {
            special_order_amount: true,
          },
          _count: true,
          where: {
            profile_id: id,
            created_date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        dailyBreakdown.push({
          date: startOfDay.toISOString().split('T')[0],
          earnings: (Number(dailyEarnings._sum.after_fiverr_amount) || 0) + (Number(dailyEarnings._sum.after_Fiverr_bonus) || 0),
          promotion_amount: Number(dailyPromotion._sum.promotion_amount) || 0,
          promotion_increase: Number(dailyPromotion._sum.actual_increase) || 0,
          special_orders_count: dailySpecialOrders._count || 0,
          special_orders_amount: Number(dailySpecialOrders._sum.special_order_amount) || 0,
        });
      }

      const profileOverview = {
        profileId: profile.id,
        profileName: profile.profile_name,
        category: categories,
        totalEarnings: parseFloat(sumOfTotalEarnings.toFixed(2)),
        promotionAmountToday: promotionAmountTodayValue > 0 ? parseFloat(promotionAmountTodayValue.toFixed(2)) : 0,
        thisMonthSpecialOrdersCount,
        thisMonthSpecialOrdersAmount: parseFloat(thisMonthSpecialOrdersAmount.toFixed(2)),
        thisMonthEarnings: parseFloat(sumOfThisMonthEarnings.toFixed(2)),
        todaysEarnings: parseFloat(sumOfTodaysEarnings.toFixed(2)),
        rankKeywordsToday,
        totalProjectsCount,
        averageRating: averageRating > 0 ? parseFloat(averageRating.toFixed(2)) : 0,
        currentRanking: currentRankingInfo,
        totalCancelledCount,
        dailyBreakdown: dailyBreakdown,
      };

      profileOverviewData.push(profileOverview);
    }

    reports.profileOverviews = profileOverviewData;

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
      per_day_average: (totalAmountDeliveredMonth / currentDayOfMonth).toFixed(2),
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
      per_day_average: (totalAmountOrderedMonth / currentDayOfMonth).toFixed(2),
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
      per_day_average: (totalAfterFiverrCancelledMonth / currentDayOfMonth).toFixed(2),
      project_details: cancelledProjectsMonth.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
      })),
    };

    // --- 4) Daily delivery breakdown ---
    const dailyDeliveries = [];
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const deliveredProjectsDay = await prisma.project.findMany({
        where: {
          status: 'delivered',
          is_delivered: true,
          delivery_date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          profile: { select: { profile_name: true } },
          team: { select: { team_name: true } },
        },
      });

      const countDeliveredDay = deliveredProjectsDay.length;
      const totalAmountDeliveredDay = deliveredProjectsDay.reduce((sum, project) => {
        const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
        const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
        return sum + fiverrAmount + bonusAmount;
      }, 0);

      dailyDeliveries.push({
        date: startOfDay.toISOString().split('T')[0],
        count: countDeliveredDay,
        total_after_fiverr_and_bonus: totalAmountDeliveredDay.toFixed(2),
        project_details: deliveredProjectsDay.map(project => ({
          project_name: project.project_name,
          order_id: project.order_id,
          profile_name: project.profile ? project.profile.profile_name : 'N/A',
          team_name: project.team ? project.team.team_name : 'N/A',
          after_fiverr_amount: project.after_fiverr_amount,
          after_Fiverr_bonus: project.after_Fiverr_bonus,
        })),
      });
    }

    reports.dailyDeliveries = dailyDeliveries.reverse(); // Sort by date descending

    // --- 5) Daily order breakdown ---
    const dailyOrders = [];
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

      const orderedProjectsDay = await prisma.project.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          profile: { select: { profile_name: true } },
          team: { select: { team_name: true } },
          team_member: { select: { first_name: true, last_name: true, team: { select: { team_name: true } } } },
        },
      });

      const countOrderedDay = orderedProjectsDay.length;
      const totalAmountOrderedDay = orderedProjectsDay.reduce((sum, project) => {
        return sum + (project.order_amount ? parseFloat(project.order_amount) : 0);
      }, 0);

      dailyOrders.push({
        date: startOfDay.toISOString().split('T')[0],
        count: countOrderedDay,
        total_amount: totalAmountOrderedDay.toFixed(2),
        project_details: orderedProjectsDay.map(project => ({
          project_name: project.project_name,
          order_id: project.order_id,
          order_amount: project.order_amount,
          profile_name: project.profile ? project.profile.profile_name : 'N/A',
          delivery_team_name: project.team ? project.team.team_name : 'N/A',
          ordered_by_member: project.team_member ? `${project.team_member.first_name} ${project.team_member.last_name}` : 'N/A',
          ordered_by_member_team: project.team_member?.team ? project.team_member.team.team_name : 'N/A',
        })),
      });
    }

    reports.dailyOrders = dailyOrders.reverse(); // Sort by date descending

    // --- 6) Promotion Costs ---
    const dailyPromotions = [];
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const dayPromotions = await prisma.profile_promotion.findMany({
        where: { created_date: { gte: startOfDay, lte: endOfDay } },
        include: { profile: { select: { profile_name: true } } },
      });
      
      const totalDayPromotionCost = dayPromotions.reduce((sum, promo) => sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0), 0);
      const totalActualIncreaseDay = dayPromotions.reduce((sum, promo) => sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0), 0);

      dailyPromotions.push({
        date: startOfDay.toISOString().split('T')[0],
        total_cost: totalDayPromotionCost.toFixed(2),
        total_actual_increase: totalActualIncreaseDay.toFixed(2),
        profile_costs: dayPromotions.map(promo => ({
          profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
          promotion_amount: promo.promotion_amount,
          actual_increase: promo.actual_increase,
        })),
      });
    }

    const monthlyPromotions = await prisma.profile_promotion.findMany({
      where: { created_date: { gte: startOfMonth, lte: endOfMonth } },
      include: { profile: { select: { profile_name: true } } },
    });
    const totalMonthlyPromotionCost = monthlyPromotions.reduce((sum, promo) => sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0), 0);
    const totalActualIncreaseMonth = monthlyPromotions.reduce((sum, promo) => sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0), 0);

    reports.promotionCosts = {
      daily_promotion: dailyPromotions.reverse(), // Sort by date descending
      this_month_promotion: {
        total_cost: totalMonthlyPromotionCost.toFixed(2),
        total_actual_increase: totalActualIncreaseMonth.toFixed(2),
        per_day_average_cost: (totalMonthlyPromotionCost / currentDayOfMonth).toFixed(2),
        profile_costs: monthlyPromotions.map(promo => ({
          profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
          promotion_amount: promo.promotion_amount,
          actual_increase: promo.actual_increase,
        })),
      },
    };

    // --- 7) Project Special Order Stats ---
    const dailySpecialOrders = [];
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const daySpecialOrders = await prisma.project_special_order.findMany({
        where: { created_date: { gte: startOfDay, lte: endOfDay } },
        include: { profile: { select: { profile_name: true } } },
      });
      
      const daySpecialOrderCount = daySpecialOrders.length;
      const totalDaySpecialOrderCost = daySpecialOrders.reduce((sum, order) => sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0), 0);

      dailySpecialOrders.push({
        date: startOfDay.toISOString().split('T')[0],
        count: daySpecialOrderCount,
        total_cost: totalDaySpecialOrderCost.toFixed(2),
        order_details: daySpecialOrders.map(order => ({
          client_name: order.client_name,
          profile_name: order.profile ? order.profile.profile_name : 'N/A',
          amount: order.special_order_amount,
        })),
      });
    }

    const monthlySpecialOrders = await prisma.project_special_order.findMany({
      where: { created_date: { gte: startOfMonth, lte: endOfMonth } },
      include: { profile: { select: { profile_name: true } } },
    });
    const monthlySpecialOrderCount = monthlySpecialOrders.length;
    const totalMonthlySpecialOrderCost = monthlySpecialOrders.reduce((sum, order) => sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0), 0);

    reports.specialOrderStats = {
      daily_special_order: dailySpecialOrders.reverse(), // Sort by date descending
      this_month_special_order: {
        count: monthlySpecialOrderCount,
        total_cost: totalMonthlySpecialOrderCost.toFixed(2),
        per_day_average_cost: (totalMonthlySpecialOrderCost / currentDayOfMonth).toFixed(2),
        order_details: monthlySpecialOrders.map(order => ({
          client_name: order.client_name,
          profile_name: order.profile ? order.profile.profile_name : 'N/A',
          amount: order.special_order_amount,
        })),
      },
    };

    // --- 8) Operational Performance with team member target calculation ---
    let totalOperationMonthlyTarget = 0;
    const teamTargetMap = {};

    if (isCurrentMonth) {
      // For current month, use current team member targets
      const operationalTeams = await prisma.team.findMany({
        where: {
          department: {
            department_name: { not: SALES_DEPARTMENT_NAME }
          }
        },
        include: {
          team_member: {
            select: {
              target: true,
            }
          }
        }
      });

      operationalTeams.forEach(team => {
        const teamMemberTargetSum = team.team_member.reduce((sum, member) => {
          return sum + (member.target ? parseFloat(member.target) : 0);
        }, 0);
        teamTargetMap[team.id] = teamMemberTargetSum;
        totalOperationMonthlyTarget += teamMemberTargetSum;
      });
    } else {
      // For previous months, use team member history
      const operationalMemberHistory = await prisma.TeamMemberTargetHistory.findMany({
        where: {
          start_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          team_member: {
            department: {
              department_name: { not: SALES_DEPARTMENT_NAME }
            }
          }
        },
        include: {
          team_member: {
            include: {
              department: true
            }
          }
        }
      });

      // Group by team_id to calculate team targets
      const teamTargetAggregates = {};
      operationalMemberHistory.forEach(history => {
        const teamId = history.team_id;
        if (teamId) {
          if (!teamTargetAggregates[teamId]) {
            teamTargetAggregates[teamId] = 0;
          }
          teamTargetAggregates[teamId] += parseFloat(history.target_amount || 0);
        }
      });

      Object.keys(teamTargetAggregates).forEach(teamId => {
        const target = teamTargetAggregates[teamId];
        teamTargetMap[parseInt(teamId)] = target;
        totalOperationMonthlyTarget += target;
      });
    }

    const totalOperationDailyTarget = totalOperationMonthlyTarget / daysInSearchMonth;

    reports.operationalPerformance = {
      targets: {
        per_day_target: totalOperationDailyTarget.toFixed(2),
        this_month: { total_member_target_sum: totalOperationMonthlyTarget.toFixed(2) },
      },
      achievements: {
        per_day_all: [],
        this_month: { total_achievement: "0.00", team_breakdown: [] },
      }
    };

    // --- Operational Achievement Daily ---
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const opDeliveredProjectsDay = await prisma.project.findMany({
        where: {
          status: 'delivered',
          is_delivered: true,
          delivery_date: { gte: startOfDay, lte: endOfDay },
          team: {
            department: {
              department_name: { not: SALES_DEPARTMENT_NAME }
            }
          }
        },
        include: {
          team: { 
            select: { 
              id: true,
              team_name: true, 
              department: { select: { department_name: true } } 
            } 
          },
          profile: { select: { profile_name: true } },
        }
      });

      const dayOpAchievementByTeam = {};
      let totalDayOpAchievement = 0;

      for (const project of opDeliveredProjectsDay) {
        if (project.team && project.team.department && project.team.department.department_name !== SALES_DEPARTMENT_NAME) {
          const teamName = project.team.team_name || 'N/A_Team';
          const teamId = project.team.id;
          if (!dayOpAchievementByTeam[teamName]) {
            dayOpAchievementByTeam[teamName] = {
              team_name: teamName,
              team_target: (teamTargetMap[teamId] || 0).toFixed(2),
              achievement: 0,
              project_count: 0,
              project_details: []
            };
          }
          const projectValue = (project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0) +
            (project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0);
          dayOpAchievementByTeam[teamName].achievement += projectValue;
          dayOpAchievementByTeam[teamName].project_count += 1;
          dayOpAchievementByTeam[teamName].project_details.push({
            project_name: project.project_name,
            order_id: project.order_id,
            profile_name: project.profile?.profile_name || 'N/A',
            after_fiverr_amount: project.after_fiverr_amount,
            after_Fiverr_bonus: project.after_Fiverr_bonus,
          });
          totalDayOpAchievement += projectValue;
        }
      }
      
      reports.operationalPerformance.achievements.per_day_all.push({
        date: startOfDay.toISOString().split('T')[0],
        total_achievement: totalDayOpAchievement.toFixed(2),
        team_breakdown: Object.values(dayOpAchievementByTeam).map(team => ({
          ...team,
          achievement: team.achievement.toFixed(2)
        }))
      });
    }

    // Sort per_day_all by date descending
    reports.operationalPerformance.achievements.per_day_all.reverse();

    // --- Operational Achievement This Month ---
    const opDeliveredProjectsMonth = await prisma.project.findMany({
      where: {
        status: 'delivered',
        is_delivered: true,
        delivery_date: { gte: startOfMonth, lte: endOfMonth },
        team: {
          department: {
            department_name: { not: SALES_DEPARTMENT_NAME }
          }
        }
      },
      include: {
        team: { 
          select: { 
            id: true,
            team_name: true, 
            department: { select: { department_name: true } } 
          } 
        },
        profile: { select: { profile_name: true } },
      }
    });

    const monthlyOpAchievementByTeam = {};
    let totalMonthlyOpAchievement = 0;

    for (const project of opDeliveredProjectsMonth) {
      if (project.team && project.team.department && project.team.department.department_name !== SALES_DEPARTMENT_NAME) {
        const teamName = project.team.team_name || 'N/A_Team';
        const teamId = project.team.id;
        if (!monthlyOpAchievementByTeam[teamName]) {
          monthlyOpAchievementByTeam[teamName] = {
            team_name: teamName,
            team_target: (teamTargetMap[teamId] || 0).toFixed(2),
            achievement: 0,
            project_count: 0,
            project_details: []
          };
        }
        const projectValue = (project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0) +
          (project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0);
        monthlyOpAchievementByTeam[teamName].achievement += projectValue;
        monthlyOpAchievementByTeam[teamName].project_count += 1;
        monthlyOpAchievementByTeam[teamName].project_details.push({
          project_name: project.project_name,
          order_id: project.order_id,
          profile_name: project.profile?.profile_name || 'N/A',
          after_fiverr_amount: project.after_fiverr_amount,
          after_Fiverr_bonus: project.after_Fiverr_bonus,
        });
        totalMonthlyOpAchievement += projectValue;
      }
    }
    reports.operationalPerformance.achievements.this_month = {
      total_achievement: totalMonthlyOpAchievement.toFixed(2),
      per_day_average: (totalMonthlyOpAchievement / currentDayOfMonth).toFixed(2),
      team_breakdown: Object.values(monthlyOpAchievementByTeam).map(team => ({
        ...team,
        achievement: team.achievement.toFixed(2)
      }))
    };

    // --- 9) Sales Performance ---
    let totalSalesMonthlyTarget = 0;
    const salesTeamTargetMap = {};

    if (isCurrentMonth) {
      // For current month, use current team member targets
      const salesTeams = await prisma.team.findMany({
        where: {
          department: {
            department_name: SALES_DEPARTMENT_NAME
          }
        },
        include: {
          team_member: {
            select: {
              target: true,
            }
          }
        }
      });

      salesTeams.forEach(team => {
        const teamMemberTargetSum = team.team_member.reduce((sum, member) => {
          return sum + (member.target ? parseFloat(member.target) : 0);
        }, 0);
        salesTeamTargetMap[team.id] = teamMemberTargetSum;
        totalSalesMonthlyTarget += teamMemberTargetSum;
      });
    } else {
      // For previous months, use team member history
      const salesMemberHistory = await prisma.TeamMemberTargetHistory.findMany({
        where: {
          start_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          team_member: {
            department: {
              department_name: SALES_DEPARTMENT_NAME
            }
          }
        },
        include: {
          team_member: {
            include: {
              department: true
            }
          }
        }
      });

      // Group by team_id to calculate team targets
      const salesTeamTargetAggregates = {};
      salesMemberHistory.forEach(history => {
        const teamId = history.team_id;
        if (teamId) {
          if (!salesTeamTargetAggregates[teamId]) {
            salesTeamTargetAggregates[teamId] = 0;
          }
          salesTeamTargetAggregates[teamId] += parseFloat(history.target_amount || 0);
        }
      });

      Object.keys(salesTeamTargetAggregates).forEach(teamId => {
        const target = salesTeamTargetAggregates[teamId];
        salesTeamTargetMap[parseInt(teamId)] = target;
        totalSalesMonthlyTarget += target;
      });
    }

    const totalSalesDailyTarget = totalSalesMonthlyTarget / daysInSearchMonth;

    reports.salesPerformance = {
      targets: {
        per_day_target: totalSalesDailyTarget.toFixed(2),
        this_month: { total_member_target_sum: totalSalesMonthlyTarget.toFixed(2) },
      },
      achievements: {
        per_day_all: [],
        this_month: { total_achievement: "0.00", team_breakdown: [] },
      }
    };

    // --- Sales Achievement Daily ---
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const salesOrderedProjectsDay = await prisma.project.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          team_member: {
            department: {
              department_name: SALES_DEPARTMENT_NAME
            }
          }
        },
        include: {
          team_member: { 
            include: { 
              team: { select: { id: true, team_name: true } }, 
              department: { select: { department_name: true } } 
            } 
          },
          profile: { select: { profile_name: true } },
        }
      });

      const daySalesAchievementByTeam = {};
      let totalDaySalesAchievement = 0;

      for (const project of salesOrderedProjectsDay) {
        if (project.team_member && project.team_member.team && project.team_member.department && project.team_member.department.department_name === SALES_DEPARTMENT_NAME) {
          const teamName = project.team_member.team.team_name || 'N/A_Sales_Team';
          const teamId = project.team_member.team.id;
          if (!daySalesAchievementByTeam[teamName]) {
            daySalesAchievementByTeam[teamName] = {
              team_name: teamName,
              achievement: 0,
              order_count: 0,
              project_details: []
            };
          }
          const orderValue = project.order_amount ? parseFloat(project.order_amount) : 0;
          daySalesAchievementByTeam[teamName].achievement += orderValue;
          daySalesAchievementByTeam[teamName].order_count += 1;
          daySalesAchievementByTeam[teamName].project_details.push({
            project_name: project.project_name,
            order_id: project.order_id,
            order_amount: project.order_amount,
            profile_name: project.profile?.profile_name || 'N/A',
            ordered_by_member: `${project.team_member.first_name || ''} ${project.team_member.last_name || ''}`.trim() || 'N/A',
          });
          totalDaySalesAchievement += orderValue;
        }
      }
      
      reports.salesPerformance.achievements.per_day_all.push({
        date: startOfDay.toISOString().split('T')[0],
        total_achievement: totalDaySalesAchievement.toFixed(2),
        team_breakdown: Object.values(daySalesAchievementByTeam).map(team => ({
          ...team,
          achievement: team.achievement.toFixed(2)
        }))
      });
    }

    // Sort per_day_all by date descending
    reports.salesPerformance.achievements.per_day_all.reverse();

    // --- Sales Achievement This Month ---
    const salesOrderedProjectsMonth = await prisma.project.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth }, // Order date
        team_member: { // The team member who ordered the project
          department: {
            department_name: SALES_DEPARTMENT_NAME
          }
        }
      },
      include: {
        team_member: { 
          include: { 
            team: { select: { id: true, team_name: true } }, 
            department: { select: { department_name: true } } 
          } 
        },
        profile: { select: { profile_name: true } },
      }
    });

    const monthlySalesAchievementByTeam = {};
    let totalMonthlySalesAchievement = 0;

    for (const project of salesOrderedProjectsMonth) {
      if (project.team_member && project.team_member.team && project.team_member.department && project.team_member.department.department_name === SALES_DEPARTMENT_NAME) {
        const teamName = project.team_member.team.team_name || 'N/A_Sales_Team';
        const teamId = project.team_member.team.id;
        if (!monthlySalesAchievementByTeam[teamName]) {
          monthlySalesAchievementByTeam[teamName] = {
            team_name: teamName,
            achievement: 0,
            order_count: 0,
            project_details: []
          };
        }
        const orderValue = project.order_amount ? parseFloat(project.order_amount) : 0;
        monthlySalesAchievementByTeam[teamName].achievement += orderValue;
        monthlySalesAchievementByTeam[teamName].order_count += 1;
        monthlySalesAchievementByTeam[teamName].project_details.push({
          project_name: project.project_name,
          order_id: project.order_id,
          order_amount: project.order_amount,
          profile_name: project.profile?.profile_name || 'N/A',
          ordered_by_member: `${project.team_member.first_name || ''} ${project.team_member.last_name || ''}`.trim() || 'N/A',
        });
        totalMonthlySalesAchievement += orderValue;
      }
    }
    reports.salesPerformance.achievements.this_month = {
      total_achievement: totalMonthlySalesAchievement.toFixed(2),
      per_day_average: (totalMonthlySalesAchievement / currentDayOfMonth).toFixed(2),
      team_breakdown: Object.values(monthlySalesAchievementByTeam).map(team => ({
        ...team,
        achievement: team.achievement.toFixed(2)
      }))
    };

    // --- 10) Projects Needing Assignment ---
    const projectsNeedingAssignment = await prisma.project.findMany({
      where: {
        team_id: null,
        // Consider adding more filters here if needed, e.g.,
        // status: { notIn: ['cancelled', 'delivered'] }, // Only active projects
      },
      include: {
        profile: { select: { profile_name: true } },
        team_member: { select: { first_name: true, last_name: true } },
      },
    });

    const countNeedingAssignment = projectsNeedingAssignment.length;
    const totalAfterFiverrAndBonusNeedingAssignment = projectsNeedingAssignment.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.projectsNeedingAssignment = {
      count: countNeedingAssignment,
      total_after_fiverr_and_bonus: totalAfterFiverrAndBonusNeedingAssignment.toFixed(2),
      project_details: projectsNeedingAssignment.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        order_amount: project.order_amount,
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
        project_date: project.date,
        ordered_by: project.team_member ? `${project.team_member.first_name} ${project.team_member.last_name}` : 'N/A',
        status: project.status,
      })),
    };

    // --- 11) Total Projects Not Delivered ---
    const projectsNotDelivered = await prisma.project.findMany({
      where: {
        is_delivered: false,
        status: { not: 'cancelled' }, // Exclude cancelled projects
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countNotDelivered = projectsNotDelivered.length;
    const totalAmountNotDelivered = projectsNotDelivered.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.totalProjectsNotDelivered = {
      count: countNotDelivered,
      total_after_fiverr_and_bonus: totalAmountNotDelivered.toFixed(2),
      project_details: projectsNotDelivered.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
        status: project.status,
      })),
    };

    // --- 12) Carry Forward Projects ---
    // This logic is now extracted into its own function, but kept here for the consolidated report if needed.
    const carryForwardProjects = await prisma.project.findMany({
      where: {
        is_delivered: false,
        date: { // Using 'date' field to check if order date is before current month
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Date not this month
        },
        status: { not: 'cancelled' }, // Not cancelled
      },
      include: {
        profile: { select: { profile_name: true } },
        team: { select: { team_name: true } },
      },
    });

    const countCarryForward = carryForwardProjects.length;
    const totalAmountCarryForward = carryForwardProjects.reduce((sum, project) => {
      const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
      const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
      return sum + fiverrAmount + bonusAmount;
    }, 0);

    reports.carryForwardProjects = {
      count: countCarryForward,
      total_after_fiverr_and_bonus: totalAmountCarryForward.toFixed(2),
      project_details: carryForwardProjects.map(project => ({
        project_name: project.project_name,
        order_id: project.order_id,
        profile_name: project.profile ? project.profile.profile_name : 'N/A',
        team_name: project.team ? project.team.team_name : 'N/A',
        after_fiverr_amount: project.after_fiverr_amount,
        after_Fiverr_bonus: project.after_Fiverr_bonus,
        order_date: project.date, // Changed to order_date for clarity
        status: project.status,
      })),
    };
    
    // --- 13) other cost Report ---
    const dailyOtherCosts = [];
    for (let dayOffset = 0; dayOffset < currentDayOfMonth; dayOffset++) {
      const targetDate = new Date(startOfMonth);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
      
      const dayOtherCosts = await prisma.othercost.findMany({
        where: {
          created_date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const totalDayCost = dayOtherCosts.reduce((sum, cost) => {
        const amount = typeof cost.cost_amount === 'string' ? parseFloat(cost.cost_amount) : cost.cost_amount;
        return sum + (amount || 0);
      }, 0);

      const costDetails = dayOtherCosts.map(cost => ({
        id: cost.id,
        date: cost.date,
        details: cost.details,
        cost_amount: typeof cost.cost_amount === 'string' ? parseFloat(cost.cost_amount) : cost.cost_amount,
      }));

      dailyOtherCosts.push({
        date: startOfDay.toISOString().split('T')[0],
        count: dayOtherCosts.length,
        total_cost: Number(totalDayCost),
        cost_details: costDetails,
      });
    }

    const thisMonthOtherCosts = await prisma.othercost.findMany({
      where: {
        created_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const calculateReportData = (costs) => {
      const totalCost = costs.reduce((sum, cost) => {
        const amount = typeof cost.cost_amount === 'string' ? parseFloat(cost.cost_amount) : cost.cost_amount;
        return sum + (amount || 0);
      }, 0);

      const costDetails = costs.map(cost => ({
        id: cost.id,
        date: cost.date,
        details: cost.details,
        cost_amount: typeof cost.cost_amount === 'string' ? parseFloat(cost.cost_amount) : cost.cost_amount,
      }));

      return {
        count: costs.length,
        total_cost: Number(totalCost),
        cost_details: costDetails,
      };
    };

    const thisMonthReportData = calculateReportData(thisMonthOtherCosts);

    reports.otherCosts = {
      per_day_all: dailyOtherCosts.reverse(), // Sort by date descending
      this_month: {
        ...thisMonthReportData,
        per_day_average_cost: (thisMonthReportData.total_cost / currentDayOfMonth).toFixed(2),
      },
    };

    res.status(200).json(reports);

  } catch (error) {
    console.error('Error fetching all consolidated reports:', error);
    res.status(500).json({ error: 'An error occurred while fetching consolidated reports.' });
  }
};












// --- New Exported Function for Total Projects Not Delivered ---
exports.getTotalProjectsNotDelivered = async (req, res) => {
    try {
        const projectsNotDelivered = await prisma.project.findMany({
            where: {
                is_delivered: false,
                status: { not: 'cancelled' }, // Exclude cancelled projects
            },
            include: {
                profile: { select: { profile_name: true } },
                team: { select: { team_name: true } },
            },
        });

        const countNotDelivered = projectsNotDelivered.length;
        const totalAmountNotDelivered = projectsNotDelivered.reduce((sum, project) => {
            const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
            const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
            return sum + fiverrAmount + bonusAmount;
        }, 0);

        res.status(200).json({
            count: countNotDelivered,
            total_after_fiverr_and_bonus: totalAmountNotDelivered.toFixed(2),
            project_details: projectsNotDelivered.map(project => ({
                project_name: project.project_name,
                order_id: project.order_id,
                profile_name: project.profile ? project.profile.profile_name : 'N/A',
                team_name: project.team ? project.team.team_name : 'N/A',
                after_fiverr_amount: project.after_fiverr_amount,
                after_Fiverr_bonus: project.after_Fiverr_bonus,
                status: project.status,
            })),
        });
    } catch (error) {
        console.error('Error fetching total projects not delivered:', error);
        res.status(500).json({ error: 'An error occurred while fetching projects not delivered.' });
    }
};

// --- New Exported Function for Carry Forward Projects ---
exports.getCarryForwardProjects = async (req, res) => {
    try {
        const carryForwardProjects = await prisma.project.findMany({
            where: {
                is_delivered: false,
                date: { // Using 'date' field to check if order date is before current month
                    lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Date not this month
                },
                status: { not: 'cancelled' }, // Not cancelled
            },
            include: {
                profile: { select: { profile_name: true } },
                team: { select: { team_name: true } },
            },
        });

        const countCarryForward = carryForwardProjects.length;
        const totalAmountCarryForward = carryForwardProjects.reduce((sum, project) => {
            const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
            const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
            return sum + fiverrAmount + bonusAmount;
        }, 0);

        res.status(200).json({
            count: countCarryForward,
            total_after_fiverr_and_bonus: totalAmountCarryForward.toFixed(2),
            project_details: carryForwardProjects.map(project => ({
                project_name: project.project_name,
                order_id: project.order_id,
                profile_name: project.profile ? project.profile.profile_name : 'N/A',
                team_name: project.team ? project.team.team_name : 'N/A',
                after_fiverr_amount: project.after_fiverr_amount,
                after_Fiverr_bonus: project.after_Fiverr_bonus,
                order_date: project.date, // Changed to order_date for clarity
                status: project.status,
            })),
        });
    } catch (error) {
        console.error('Error fetching carry forward projects:', error);
        res.status(500).json({ error: 'An error occurred while fetching carry forward projects.' });
    }
};


// --- Report Controller Functions ---

// 1. Project Delivery Reports
exports.getMonthlyDeliveries = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthDateRange();

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

        res.status(200).json({
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
        });

    } catch (error) {
        console.error('Error fetching monthly deliveries:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly delivery reports.' });
    }
};

exports.getTodaysDeliveries = async (req, res) => {
    try {
        const { startOfToday, endOfToday } = getTodayDateRange();

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

        res.status(200).json({
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
        });

    } catch (error) {
        console.error('Error fetching today\'s deliveries:', error);
        res.status(500).json({ error: 'An error occurred while fetching today\'s delivery reports.' });
    }
};

// 2. Project Order Reports
exports.getMonthlyOrders = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const orderedProjectsMonth = await prisma.project.findMany({
            where: {
                date: {
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

        res.status(200).json({
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
        });

    } catch (error) {
        console.error('Error fetching monthly orders:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly order reports.' });
    }
};

exports.getTodaysOrders = async (req, res) => {
    try {
        const { startOfToday, endOfToday } = getTodayDateRange();

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

        res.status(200).json({
            count: countOrderedToday,
            total_amount: totalAmountOrderedToday.toFixed(2),
            project_details: orderedProjectsToday.map(project => ({
                project_name: project.project_name,
                order_id: project.order_id,
                order_amount: project.order_amount,
                profile_name: project.profile ? project.profile.profile_name : 'N/A',
                delivery_team_name: project.team ? project.team.team_name : 'N/A',
                ordered_by_member: project.team_member ? `${project.team_member.first_name} ${project.team_member.last_name}` : 'N/A',
                ordered_by_member_team: project.team_member?.team ? project.team_member.team.team_name : 'N/A',
            })),
        });

    } catch (error) {
        console.error('Error fetching today\'s orders:', error);
        res.status(500).json({ error: 'An error occurred while fetching today\'s order reports.' });
    }
};

// 3. Project Cancellation Reports
exports.getMonthlyCancellations = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const cancelledProjectsMonth = await prisma.project.findMany({
            where: {
                status: 'cancelled',
                update_at: {
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

        res.status(200).json({
            count: countCancelledMonth,
            total_after_fiverr: totalAfterFiverrCancelledMonth.toFixed(2),
            project_details: cancelledProjectsMonth.map(project => ({
                project_name: project.project_name,
                order_id: project.order_id,
                profile_name: project.profile ? project.profile.profile_name : 'N/A',
                team_name: project.team ? project.team.team_name : 'N/A',
                after_fiverr_amount: project.after_fiverr_amount,
            })),
        });

    } catch (error) {
        console.error('Error fetching monthly cancellations:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly cancellation reports.' });
    }
};

// 4. Promotion Cost Reports
exports.getTodaysPromotionCosts = async (req, res) => {
    try {
        const { startOfToday, endOfToday } = getTodayDateRange();

        const todaysPromotions = await prisma.profile_promotion.findMany({
            where: { created_date: { gte: startOfToday, lte: endOfToday } },
            include: { profile: { select: { profile_name: true } } },
        });
        const totalTodayPromotionCost = todaysPromotions.reduce((sum, promo) => sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0), 0);
        const totalActualIncreaseToday = todaysPromotions.reduce((sum, promo) => sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0), 0);

        res.status(200).json({
            total_cost: totalTodayPromotionCost.toFixed(2),
            total_actual_increase: totalActualIncreaseToday.toFixed(2),
            profile_costs: todaysPromotions.map(promo => ({
                profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
                promotion_amount: promo.promotion_amount,
                actual_increase: promo.actual_increase,
            })),
        });

    } catch (error) {
        console.error('Error fetching today\'s promotion costs:', error);
        res.status(500).json({ error: 'An error occurred while fetching today\'s promotion costs.' });
    }
};

exports.getMonthlyPromotionCosts = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const monthlyPromotions = await prisma.profile_promotion.findMany({
            where: { created_date: { gte: startOfMonth, lte: endOfMonth } },
            include: { profile: { select: { profile_name: true } } },
        });
        const totalMonthlyPromotionCost = monthlyPromotions.reduce((sum, promo) => sum + (promo.promotion_amount ? parseFloat(promo.promotion_amount) : 0), 0);
        const totalActualIncreaseMonth = monthlyPromotions.reduce((sum, promo) => sum + (promo.actual_increase ? parseFloat(promo.actual_increase) : 0), 0);

        res.status(200).json({
            total_cost: totalMonthlyPromotionCost.toFixed(2),
            total_actual_increase: totalActualIncreaseMonth.toFixed(2),
            profile_costs: monthlyPromotions.map(promo => ({
                profile_name: promo.profile ? promo.profile.profile_name : 'N/A',
                promotion_amount: promo.promotion_amount,
                actual_increase: promo.actual_increase,
            })),
        });

    } catch (error) {
        console.error('Error fetching monthly promotion costs:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly promotion costs.' });
    }
};

// 5. Special Order Reports
exports.getTodaysSpecialOrders = async (req, res) => {
    try {
        const { startOfToday, endOfToday } = getTodayDateRange();

        const todaysSpecialOrders = await prisma.project_special_order.findMany({
            where: { created_date: { gte: startOfToday, lte: endOfToday } },
            include: { profile: { select: { profile_name: true } } },
        });
        const todaySpecialOrderCount = todaysSpecialOrders.length;
        const totalTodaySpecialOrderCost = todaysSpecialOrders.reduce((sum, order) => sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0), 0);

        res.status(200).json({
            count: todaySpecialOrderCount,
            total_cost: totalTodaySpecialOrderCost.toFixed(2),
            order_details: todaysSpecialOrders.map(order => ({
                client_name: order.client_name,
                profile_name: order.profile ? order.profile.profile_name : 'N/A',
                amount: order.special_order_amount,
            })),
        });

    } catch (error) {
        console.error('Error fetching today\'s special orders:', error);
        res.status(500).json({ error: 'An error occurred while fetching today\'s special orders.' });
    }
};

exports.getMonthlySpecialOrders = async (req, res) => {
    try {
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const monthlySpecialOrders = await prisma.project_special_order.findMany({
            where: { created_date: { gte: startOfMonth, lte: endOfMonth } },
            include: { profile: { select: { profile_name: true } } },
        });
        const monthlySpecialOrderCount = monthlySpecialOrders.length;
        const totalMonthlySpecialOrderCost = monthlySpecialOrders.reduce((sum, order) => sum + (order.special_order_amount ? parseFloat(order.special_order_amount) : 0), 0);

        res.status(200).json({
            count: monthlySpecialOrderCount,
            total_cost: totalMonthlySpecialOrderCost.toFixed(2),
            order_details: monthlySpecialOrders.map(order => ({
                client_name: order.client_name,
                profile_name: order.profile ? order.profile.profile_name : 'N/A',
                amount: order.special_order_amount,
            })),
        });

    } catch (error) {
        console.error('Error fetching monthly special orders:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly special orders.' });
    }
};

// 6. Operational Performance Reports
exports.getOperationalPerformance = async (req, res) => {
    try {
        const SALES_DEPARTMENT_NAME = 'sales'; // Or from config
        const { startOfToday, endOfToday } = getTodayDateRange();
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const today = new Date();
        const daysInCurrentMonth = getDaysInMonth(today.getFullYear(), today.getMonth());

        // Operational Targets
        const allTeamMembersForTargets = await prisma.team_member.findMany({
            include: {
                department: { select: { department_name: true } },
            }
        });

        const operationalTeamMembers = allTeamMembersForTargets.filter(
            member => member.department && member.department.department_name !== SALES_DEPARTMENT_NAME
        );

        const totalOperationMonthlyTarget = operationalTeamMembers.reduce(
            (sum, member) => sum + (member.target ? parseFloat(member.target) : 0), 0
        );
        const totalOperationDailyTarget = totalOperationMonthlyTarget / daysInCurrentMonth;

        const operationalPerformance = {
            targets: {
                today: { total_member_target_sum: totalOperationDailyTarget.toFixed(2) },
                this_month: { total_member_target_sum: totalOperationMonthlyTarget.toFixed(2) },
            },
            achievements: {
                today: { total_achievement: "0.00", team_breakdown: [] },
                this_month: { total_achievement: "0.00", team_breakdown: [] },
            }
        };

        // Operational Achievement This Month
        const opDeliveredProjectsMonth = await prisma.project.findMany({
            where: {
                status: 'delivered',
                is_delivered: true,
                delivery_date: { gte: startOfMonth, lte: endOfMonth },
                team: {
                    department: {
                        department_name: { not: SALES_DEPARTMENT_NAME }
                    }
                }
            },
            include: {
                team: { select: { team_name: true, team_target: true, department: { select: { department_name: true } } } },
                profile: { select: { profile_name: true } },
            }
        });

        const monthlyOpAchievementByTeam = {};
        let totalMonthlyOpAchievement = 0;

        for (const project of opDeliveredProjectsMonth) {
            if (project.team && project.team.department && project.team.department.department_name !== SALES_DEPARTMENT_NAME) {
                const teamName = project.team.team_name || 'N/A_Team';
                if (!monthlyOpAchievementByTeam[teamName]) {
                    monthlyOpAchievementByTeam[teamName] = {
                        team_name: teamName,
                        team_target: project.team.team_target ? parseFloat(project.team.team_target).toFixed(2) : "0.00",
                        achievement: 0,
                        project_count: 0,
                        project_details: []
                    };
                }
                const projectValue = (project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0) +
                    (project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0);
                monthlyOpAchievementByTeam[teamName].achievement += projectValue;
                monthlyOpAchievementByTeam[teamName].project_count += 1;
                monthlyOpAchievementByTeam[teamName].project_details.push({
                    project_name: project.project_name,
                    order_id: project.order_id,
                    profile_name: project.profile?.profile_name || 'N/A',
                    after_fiverr_amount: project.after_fiverr_amount,
                    after_Fiverr_bonus: project.after_Fiverr_bonus,
                });
                totalMonthlyOpAchievement += projectValue;
            }
        }
        operationalPerformance.achievements.this_month = {
            total_achievement: totalMonthlyOpAchievement.toFixed(2),
            team_breakdown: Object.values(monthlyOpAchievementByTeam).map(team => ({
                ...team,
                achievement: team.achievement.toFixed(2)
            }))
        };

        // Operational Achievement Today
        const opDeliveredProjectsToday = await prisma.project.findMany({
            where: {
                status: 'delivered',
                is_delivered: true,
                delivery_date: { gte: startOfToday, lte: endOfToday },
                team: {
                    department: {
                        department_name: { not: SALES_DEPARTMENT_NAME }
                    }
                }
            },
            include: {
                team: { select: { team_name: true, team_target: true, department: { select: { department_name: true } } } },
                profile: { select: { profile_name: true } },
            }
        });

        const todayOpAchievementByTeam = {};
        let totalTodayOpAchievement = 0;

        for (const project of opDeliveredProjectsToday) {
            if (project.team && project.team.department && project.team.department.department_name !== SALES_DEPARTMENT_NAME) {
                const teamName = project.team.team_name || 'N/A_Team';
                if (!todayOpAchievementByTeam[teamName]) {
                    todayOpAchievementByTeam[teamName] = {
                        team_name: teamName,
                        team_target: project.team.team_target ? parseFloat(project.team.team_target).toFixed(2) : "0.00",
                        achievement: 0,
                        project_count: 0,
                        project_details: []
                    };
                }
                const projectValue = (project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0) +
                    (project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0);
                todayOpAchievementByTeam[teamName].achievement += projectValue;
                todayOpAchievementByTeam[teamName].project_count += 1;
                todayOpAchievementByTeam[teamName].project_details.push({
                    project_name: project.project_name,
                    order_id: project.order_id,
                    profile_name: project.profile?.profile_name || 'N/A',
                    after_fiverr_amount: project.after_fiverr_amount,
                    after_Fiverr_bonus: project.after_Fiverr_bonus,
                });
                totalTodayOpAchievement += projectValue;
            }
        }
        operationalPerformance.achievements.today = {
            total_achievement: totalTodayOpAchievement.toFixed(2),
            team_breakdown: Object.values(todayOpAchievementByTeam).map(team => ({
                ...team,
                achievement: team.achievement.toFixed(2)
            }))
        };

        res.status(200).json(operationalPerformance);

    } catch (error) {
        console.error('Error fetching operational performance:', error);
        res.status(500).json({ error: 'An error occurred while fetching operational performance reports.' });
    }
};


// 7. Sales Performance Reports
exports.getSalesPerformance = async (req, res) => {
    try {
        const SALES_DEPARTMENT_NAME = 'sales'; // Or from config
        const { startOfToday, endOfToday } = getTodayDateRange();
        const { startOfMonth, endOfMonth } = getMonthDateRange();

        const today = new Date();
        const daysInCurrentMonth = getDaysInMonth(today.getFullYear(), today.getMonth());

        // Sales Targets
        const allTeamMembersForTargets = await prisma.team_member.findMany({
            include: {
                department: { select: { department_name: true } },
            }
        });

        const salesTeamMembers = allTeamMembersForTargets.filter(
            member => member.department && member.department.department_name === SALES_DEPARTMENT_NAME
        );
        const totalSalesMonthlyTarget = salesTeamMembers.reduce(
            (sum, member) => sum + (member.target ? parseFloat(member.target) : 0), 0
        );
        const totalSalesDailyTarget = totalSalesMonthlyTarget / daysInCurrentMonth;

        const salesPerformance = {
            targets: {
                today: { total_member_target_sum: totalSalesDailyTarget.toFixed(2) },
                this_month: { total_member_target_sum: totalSalesMonthlyTarget.toFixed(2) },
            },
            achievements: {
                today: { total_achievement: "0.00", team_breakdown: [] },
                this_month: { total_achievement: "0.00", team_breakdown: [] },
            }
        };

        // Sales Achievement This Month
        const salesOrderedProjectsMonth = await prisma.project.findMany({
            where: {
                date: { gte: startOfMonth, lte: endOfMonth },
                team_member: {
                    department: {
                        department_name: SALES_DEPARTMENT_NAME
                    }
                }
            },
            include: {
                team_member: { include: { team: { select: { team_name: true } }, department: { select: { department_name: true } } } },
                profile: { select: { profile_name: true } },
            }
        });

        const monthlySalesAchievementByTeam = {};
        let totalMonthlySalesAchievement = 0;

        for (const project of salesOrderedProjectsMonth) {
            if (project.team_member && project.team_member.team && project.team_member.department && project.team_member.department.department_name === SALES_DEPARTMENT_NAME) {
                const teamName = project.team_member.team.team_name || 'N/A_Sales_Team';
                if (!monthlySalesAchievementByTeam[teamName]) {
                    monthlySalesAchievementByTeam[teamName] = {
                        team_name: teamName,
                        achievement: 0,
                        order_count: 0,
                        project_details: []
                    };
                }
                const orderValue = project.order_amount ? parseFloat(project.order_amount) : 0;
                monthlySalesAchievementByTeam[teamName].achievement += orderValue;
                monthlySalesAchievementByTeam[teamName].order_count += 1;
                monthlySalesAchievementByTeam[teamName].project_details.push({
                    project_name: project.project_name,
                    order_id: project.order_id,
                    order_amount: project.order_amount,
                    profile_name: project.profile?.profile_name || 'N/A',
                    ordered_by_member: `${project.team_member.first_name || ''} ${project.team_member.last_name || ''}`.trim() || 'N/A',
                });
                totalMonthlySalesAchievement += orderValue;
            }
        }
        salesPerformance.achievements.this_month = {
            total_achievement: totalMonthlySalesAchievement.toFixed(2),
            team_breakdown: Object.values(monthlySalesAchievementByTeam).map(team => ({
                ...team,
                achievement: team.achievement.toFixed(2)
            }))
        };

        // Sales Achievement Today
        const salesOrderedProjectsToday = await prisma.project.findMany({
            where: {
                date: { gte: startOfToday, lte: endOfToday },
                team_member: {
                    department: {
                        department_name: SALES_DEPARTMENT_NAME
                    }
                }
            },
            include: {
                team_member: { include: { team: { select: { team_name: true } }, department: { select: { department_name: true } } } },
                profile: { select: { profile_name: true } },
            }
        });

        const todaySalesAchievementByTeam = {};
        let totalTodaySalesAchievement = 0;

        for (const project of salesOrderedProjectsToday) {
   console.log(project.team_member?.department?.department_name);
            if (project.team_member && project.team_member.team && project.team_member.department && project.team_member.department.department_name === SALES_DEPARTMENT_NAME) {
                const teamName = project.team_member.team.team_name || 'N/A_Sales_Team';
                if (!todaySalesAchievementByTeam[teamName]) {
                    todaySalesAchievementByTeam[teamName] = {
                        team_name: teamName,
                        achievement: 0,
                        order_count: 0,
                        project_details: []
                    };
                }
                const orderValue = project.order_amount ? parseFloat(project.order_amount) : 0;
                todaySalesAchievementByTeam[teamName].achievement += orderValue;
                todaySalesAchievementByTeam[teamName].order_count += 1;
                todaySalesAchievementByTeam[teamName].project_details.push({
                    project_name: project.project_name,
                    order_id: project.order_id,
                    order_amount: project.order_amount,
                    profile_name: project.profile?.profile_name || 'N/A',
                    ordered_by_member: `${project.team_member.first_name || ''} ${project.team_member.last_name || ''}`.trim() || 'N/A',
                });
                totalTodaySalesAchievement += orderValue;
            }
        }
        salesPerformance.achievements.today = {
            total_achievement: totalTodaySalesAchievement.toFixed(2),
            team_breakdown: Object.values(todaySalesAchievementByTeam).map(team => ({
                ...team,
                achievement: team.achievement.toFixed(2)
            }))
        };

        res.status(200).json(salesPerformance);

    } catch (error) {
        console.error('Error fetching sales performance:', error);
        res.status(500).json({ error: 'An error occurred while fetching sales performance reports.' });
    }
};

// 8. Projects Needing Assignment Report
exports.getProjectsNeedingAssignment = async (req, res) => {
    try {
        const projectsNeedingAssignment = await prisma.project.findMany({
            where: {
                team_id: null,
            },
            include: {
                profile: { select: { profile_name: true } },
                team_member: { select: { first_name: true, last_name: true } } // Who created the project if applicable
            },
        });

        const countNeedingAssignment = projectsNeedingAssignment.length;
        const totalAfterFiverrAndBonusNeedingAssignment = projectsNeedingAssignment.reduce((sum, project) => {
            const fiverrAmount = project.after_fiverr_amount ? parseFloat(project.after_fiverr_amount) : 0;
            const bonusAmount = project.after_Fiverr_bonus ? parseFloat(project.after_Fiverr_bonus) : 0;
            return sum + fiverrAmount + bonusAmount;
        }, 0);

        res.status(200).json({
            count: countNeedingAssignment,
            total_after_fiverr_and_bonus: totalAfterFiverrAndBonusNeedingAssignment.toFixed(2),
            project_details: projectsNeedingAssignment.map(project => ({
                project_name: project.project_name,
                order_id: project.order_id,
                profile_name: project.profile ? project.profile.profile_name : 'N/A',
                order_amount: project.order_amount,
                after_fiverr_amount: project.after_fiverr_amount,
                after_Fiverr_bonus: project.after_Fiverr_bonus,
                project_date: project.date, // Original order date
                ordered_by: project.team_member ? `${project.team_member.first_name} ${project.team_member.last_name}` : 'N/A',
                status: project.status,
            })),
        });

    } catch (error) {
        console.error('Error fetching projects needing assignment:', error);
        res.status(500).json({ error: 'An error occurred while fetching projects that need assignment.' });
    }
};










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












//crud
exports.createOtherCost = async (req, res) => {
  try {
    const { details, cost_amount } = req.body;

    // Validate required fields
    if (  !details || cost_amount === undefined) {
      return res.status(400).json({ message: 'Date, details, and cost amount are required.' });
    }

    // Create the other cost entry
    const newOtherCost = await prisma.othercost.create({
      data: {
        date: new Date(),
        details,
        cost_amount: parseFloat(cost_amount), // Ensure it's a number
        created_date: new Date(),
        update_at: new Date(),
      },
    });

    res.status(201).json({ message: 'Other cost created successfully', data: newOtherCost });
  } catch (error) {
    console.error('Error creating other cost:', error);
    res.status(500).json({ message: 'Failed to create other cost', error: error.message });
  }
};
exports.getAllOtherCosts = async (req, res) => {
  try {
    const otherCosts = await prisma.othercost.findMany({
      orderBy: {
        date: 'desc',
      },
    });

    res.status(200).json({ message: 'Other costs retrieved successfully', data: otherCosts });
  } catch (error) {
    console.error('Error fetching other costs:', error);
    res.status(500).json({ message: 'Failed to fetch other costs', error: error.message });
  }
};

exports.updateOtherCost = async (req, res) => {
  try {
    const { id } = req.params;
  

    // Update the other cost entry
    const updatedOtherCost = await prisma.othercost.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        update_at: new Date(),
      },
    });

    res.status(200).json({ message: 'Other cost updated successfully', data: updatedOtherCost });
  } catch (error) {
    console.error('Error updating other cost:', error);
    res.status(500).json({ message: 'Failed to update other cost', error: error.message });
  }
};

exports.deleteOtherCost = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the other cost entry
    await prisma.othercost.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Other cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting other cost:', error);
    res.status(500).json({ message: 'Failed to delete other cost', error: error.message });
  }
};