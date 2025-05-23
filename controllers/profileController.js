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
    const { profile_name, department_id } = req.body;

    if (!profile_name) {
      return res.status(400).json({ message: 'Profile name is required' });
    }

    const data = {
      profile_name,
      created_date: new Date(),
    };

    // Connect to department if department_id is provided
    if (department_id) {
      data.department = {
        connect: { id: parseInt(department_id) },
        
      };
    }

    const newProfile = await prisma.profile.create({
      data,
    });

    return res.status(201).json({ message: 'Profile created successfully', profile: newProfile });
  } catch (error) {
    console.error('Error creating profile:', error);
    return res.status(500).json({ message: 'An error occurred while creating the profile', error: error.message });
  }
};


exports.getAllProfiles = async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        department: true, // Include the related department
        projects: true, // Include the related projects
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

    if (promotion_amount != null) updateData.promotion_amount = promotion_amount;
    if (clicks != null) updateData.clicks = clicks;
    if (impressions != null) updateData.impressions = impressions;

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