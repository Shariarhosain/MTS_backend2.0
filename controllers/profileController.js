const { PrismaClient } = require('@prisma/client');
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
try{
  

  //post type profile name, ranking page , row , keywords
  const { profileName, rankingPage, row, keywords } = req.body;

  if (!profileName || !rankingPage || !row || !keywords) {
    return res.status(400).json({
      message: 'Invalid request: profileName, rankingPage, row, and keywords are required',
    });
  }

  /*model profile_ranking {
  id             Int          @id @default(autoincrement())
  profile_id     Int
  profile        profile      @relation(fields: [profile_id], references: [id])
  keywords       String?
  row          Int?
  ranking_page  String?
  created_date   DateTime?
  update_at      DateTime?
}

 */
const profile = await prisma.profile.findUnique({
    where: { profile_name: profileName },
  });
  if (!profile) {
    return res.status(404).json({
      message: 'Profile not found',
    });
  }
  const profileId = profile.id;
  // Check if the profile already has a ranking entry

  const profileRanking = await prisma.profile_ranking.create({
    data: {
      profile_id: profileId,
      keywords: keywords,
      row: row,
      ranking_page: rankingPage,
      created_date: new Date(),
      update_at: new Date(),
    },
  });

  return res.status(200).json({
    message: 'Profile updated successfully',
    profile: profileRanking,
  });
} catch (error) {
  console.error('Error updating profile:', error);
  return res.status(500).json({
    message: 'An error occurred while updating the profile',
    error: error.message,
  });

};
}


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











exports.promotionprofile = async (req, res) => {
  try {
    const { profileName, promotionAmount } = req.body;

    if (!profileName || !promotionAmount) {
      return res.status(400).json({
        message: 'Invalid request: profileName and promotionAmount are required',
      });
    }
    // Find the profile by name
    const profile = await prisma.profile.findUnique({
      where: { profile_name: profileName },
    });

    if (!profile) {
      return res.status(404).json({
        message: 'Profile not found',
      });
    }

    const profileId = profile.id;

    // crete a new profile_promotion
    const profilePromotion = await prisma.profile_promotion.create({
      data: {
        profile_id: profileId,
        promotion_amount: promotionAmount,
        created_date: new Date(),
        update_at: new Date(),
      },
    });

    return res.status(200).json({
      message: 'profilePromotion created successfully',
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
    // getall profile ranking data select all
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



exports.updateprofile_promotion = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }

    const updatedProfilePromotion = await prisma.profile_promotion.update({
      where: { id: Number(id) },
      data: {
       ...req.body,
        update_at: new Date(),
      }, 
    });

    return res.status(200).json({
      message: 'Profile promotion updated successfully',
      profilePromotion: updatedProfilePromotion,
    });
  } catch (error) {
    console.error('Error updating profile promotion:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile promotion',
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
  try {


    const updatedOrder = await prisma.project_special_order.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        update_at: new Date(),
      },
      include: { profile: true },
    });
    res.json({
      message: 'Special order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating special order:', error);
    res.status(500).json({ error: 'Failed to update special order' });
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